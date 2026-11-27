use super::{draw, draw_images, Engine, PreparedEdit, WORKING_FORMAT};
use crate::params::{DevelopParams, GradeKind, GradeStep};
use crate::post::PostParams;

const FULL: [f32; 4] = [-1.0, -1.0, 1.0, 1.0];
const CLEAR: wgpu::Color = wgpu::Color::TRANSPARENT;

pub(super) struct GradeDraw<'a> {
    pub views: &'a [wgpu::TextureView; 2],
    pub working: (u32, u32),
    pub size: [f32; 4],
    pub effect_size: [f32; 4],
    pub window: [f32; 4],
    pub aspect: f32,
    pub coverage: Option<&'a wgpu::TextureView>,
    pub mask_plate: Option<&'a str>,
    pub picking: bool,
}

impl Engine {
    pub(super) fn plate_groups(&mut self, plate: &crate::masks::PreparedPlate, params: &DevelopParams, input: &wgpu::TextureView, aspect: f32) -> [wgpu::BindGroup; 2] {
        let curves = self.curve_view_for(plate.edit.curve_table.as_ref());
        [self.develop_group(params, input, &curves), self.mask_group(&plate.mask_block(aspect), &plate.brushes())]
    }

    fn grade_base(&mut self, (width, height): (u32, u32)) -> wgpu::TextureView {
        if self.images.grade_base.as_ref().is_none_or(|(size, _)| *size != (width, height)) {
            let view = self.device.create_texture(&wgpu::TextureDescriptor {
                label: Some("grade node input"),
                size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: WORKING_FORMAT,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            }).create_view(&Default::default());
            self.images.grade_base = Some(((width, height), view));
        }
        self.images.grade_base.as_ref().unwrap().1.clone()
    }

    pub(super) fn draw_grade_graph(&mut self, encoder: &mut wgpu::CommandEncoder, edit: &PreparedEdit, nodes: &[GradeStep], draw_state: GradeDraw<'_>) -> usize {
        let GradeDraw { views, working, size, effect_size, window, aspect, coverage, mask_plate, picking } = draw_state;
        let curves = self.curve_texture.create_view(&Default::default());
        let mut current = 0;
        let copy_params = PostParams { rect: FULL, ..edit.post.params };
        // Earlier nodes can see the same selected plate if the saved graph
        // invokes the plate stack again. The final invocation supplies coverage.
        if let Some(coverage) = coverage {
            let _clear = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: coverage, depth_slice: None, resolve_target: None,
                    ops: wgpu::Operations { load: wgpu::LoadOp::Clear(CLEAR), store: wgpu::StoreOp::Store },
                })],
                ..Default::default()
            });
        }
        for node in nodes {
            let before = (node.opacity < 1.0).then(|| {
                let base = self.grade_base(working);
                let group = self.post_group(&copy_params, &views[current], None);
                let pipeline = self.post_pipeline("fs_copy", WORKING_FORMAT);
                draw(encoder, &base, CLEAR, &pipeline, &[&group]);
                base
            });
            match node.kind {
                GradeKind::PlateComposite => {
                    for plate in &edit.plates {
                        let selected = mask_plate == Some(plate.id.as_str());
                        if plate.opacity == 0.0 && !selected { continue; }
                        let params = DevelopParams { rect: FULL, output_window: window, ..plate.edit.params };
                        let [image, masks] = self.plate_groups(plate, &params, &views[current], aspect);
                        let out = &views[1 - current];
                        if let Some(mask) = coverage.filter(|_| selected) {
                            let entry = if picking { "fs_plate_with_sample" } else { "fs_plate_with_coverage" };
                            let pipeline = self.plate_pipeline(entry, WORKING_FORMAT);
                            draw_images(encoder, &[(out, wgpu::LoadOp::Clear(CLEAR)), (mask, wgpu::LoadOp::Clear(CLEAR))], &pipeline, &[&image, &masks]);
                        } else {
                            let pipeline = self.plate_pipeline("fs_plate", WORKING_FORMAT);
                            draw(encoder, out, CLEAR, &pipeline, &[&image, &masks]);
                        }
                        current = 1 - current;
                    }
                }
                kind => {
                    let input = &views[current];
                    let out = &views[1 - current];
                    if let Some((step, params)) = node.post {
                        self.draw_post_step(encoder, &step, PostParams { size, effect_size, rect: FULL, window, ..params }, input, working, (out, WORKING_FORMAT, CLEAR));
                    } else {
                        let mut params = DevelopParams { rect: FULL, ..node.shader };
                        let entry = match kind {
                            GradeKind::Develop => "fs_node_develop",
                            GradeKind::Curve => "fs_node_curve",
                            GradeKind::OklchMixer => "fs_node_mixer",
                            GradeKind::ColorWheels => "fs_node_wheels",
                            GradeKind::Lut => {
                                if let Some((size, min, max)) = self.lut_info {
                                    params.lut = [params.lut[0], size as f32, f32::from(params.lut[0] > 0.0), 0.0];
                                    params.lut_domain_min = [min[0], min[1], min[2], 0.0];
                                    params.lut_domain_max = [max[0], max[1], max[2], 0.0];
                                }
                                "fs_node_lut"
                            }
                            _ => unreachable!("post nodes are prepared with a pass"),
                        };
                        let group = self.develop_group(&params, input, &curves);
                        let pipeline = self.pipeline(entry, WORKING_FORMAT);
                        draw(encoder, out, CLEAR, pipeline, &[&group]);
                    }
                    current = 1 - current;
                }
            }
            if let Some(before) = before {
                let mut params = copy_params;
                params.composite[3] = node.opacity;
                let group = self.post_group(&params, &views[current], Some(&before));
                let pipeline = self.post_pipeline("fs_node_opacity", WORKING_FORMAT);
                draw(encoder, &views[1 - current], CLEAR, &pipeline, &[&group]);
                current = 1 - current;
            }
        }
        current
    }
}
