# Creative effects

Open a photograph, then choose **Edit → Creative Effects → Browse effects**. Select an effect to add it at the bottom of the stack. Use the eye next to a library result to preview it before applying. Effects run from top to bottom. Each layer has its own controls, order, visibility, and opacity. A studio look loads its component layers for editing. Turn on **Add to current stack** to keep the current layers when applying a look.

The editor, history, virtual copies, projects, and print recipes store the same effect settings. The phase slider sets the frame for still exports. **Play effect** previews movement in the editor. **Freeze frame** commits the current phase as an undoable edit.

## Reference inventory

| Public reference | Intaglio implementation |
| --- | --- |
| 106 real-time styles in the live ASCII Magic editor | Individual treatments in the effects library. This includes the ten variants under the shared glass mode. |
| Finishing controls in the editor and landing page | The stack supports 16 additional finishing effects. Styles such as RGB Split, Scanline, Halftone, the distortion family, and the blur family can also be used as finishing layers. |
| 171 generative looks | 171 editable procedural looks built from the source image, including 14 additional tools for material shading, print layouts, refraction, type, and signal overlays. |
| Classic recipes | 20 editable stacks, including Matrix, Noir, Vaporwave, and C64 Palette Dither. |

The live [ASCII Magic editor](https://www.ascii-magic.com/app) and its publicly loaded resources supplied the inventory. The [styles gallery](https://www.ascii-magic.com/styles) and [recipes](https://www.ascii-magic.com/recipes) supplied descriptions and examples. Each treatment uses Intaglio's own rendering code. Studio looks preserve an input photograph's subject and recreate the surface, palette, geometry, and layout with image processing. Looks such as Voxel World, Claymation, X-Ray Ghost, and MRI Scan are visual stylizations of that source.

## Rendering

The stack runs after the display transform on the full frame. The effects share a WebGL pass with separate shader programs. Dithering and pixel sorting use CPU raster algorithms with a bounded sampling grid. Pattern sizes are normalized to the shorter image edge so changing preview size or export scale preserves the composition.

The library lives inside the Edit panel to keep the canvas visible during browsing. Search, categories, a preview button, and an editable stack use Intaglio's existing Develop controls. Projects and recipes require no format migration.

All processing is local. PNG, JPEG, and WebP use the same stack as preview. Full-frame effects such as lens refraction and kaleidoscope need the whole image available for sampling, so a creative export’s longest edge must fit within the browser’s GPU texture limit.
