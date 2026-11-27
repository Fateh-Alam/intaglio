fn main() {
    let path = std::env::args().nth(1).expect("GLSL input path");
    let source = std::fs::read_to_string(path).expect("read GLSL input");
    let module = naga::front::glsl::Frontend::default()
        .parse(
            &naga::front::glsl::Options::from(naga::ShaderStage::Fragment),
            &source,
        )
        .unwrap_or_else(|errors| panic!("{}", errors.emit_to_string(&source)));
    let info = naga::valid::Validator::new(
        naga::valid::ValidationFlags::all(),
        naga::valid::Capabilities::all(),
    )
    .validate(&module)
    .unwrap_or_else(|error| panic!("{}", error.emit_to_string(&source)));
    print!(
        "{}",
        naga::back::wgsl::write_string(&module, &info, naga::back::wgsl::WriterFlags::empty())
            .expect("generate WGSL")
    );
}
