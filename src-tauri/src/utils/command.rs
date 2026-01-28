use std::io::{self, Read};
use std::process::{Command, Output, Stdio};
use std::time::{Duration, Instant};

pub fn command_no_window(program: &str) -> Command {
    #[allow(unused_mut)]
    let mut command = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
}

pub fn command_output_with_timeout(
    program: &str,
    args: &[&str],
    timeout: Duration,
) -> io::Result<Output> {
    let mut child = command_no_window(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let start = Instant::now();
    loop {
        if let Some(status) = child.try_wait()? {
            let mut stdout = Vec::new();
            let mut stderr = Vec::new();

            if let Some(mut out) = child.stdout.take() {
                let _ = out.read_to_end(&mut stdout);
            }
            if let Some(mut err) = child.stderr.take() {
                let _ = err.read_to_end(&mut stderr);
            }

            return Ok(Output {
                status,
                stdout,
                stderr,
            });
        }

        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!("Command timed out: {} {}", program, args.join(" ")),
            ));
        }

        std::thread::sleep(Duration::from_millis(50));
    }
}
