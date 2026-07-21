fn main() {
    #[cfg(feature = "desktop")]
    tauri_build::build();

    // Core-only tests do not need Tauri's generated context or native toolkit
    // dependencies. Keep the build script valid for that profile.
    #[cfg(not(feature = "desktop"))]
    println!("cargo:rerun-if-changed=build.rs");
}
