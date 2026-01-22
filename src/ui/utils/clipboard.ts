import { spawn } from "node:child_process";

type ClipboardCommand = {
  command: string;
  args: string[];
};

const runClipboardCommand = (command: ClipboardCommand, text: string) =>
  new Promise<boolean>((resolve) => {
    const child = spawn(command.command, command.args, {
      stdio: ["pipe", "ignore", "ignore"],
    });

    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));

    if (child.stdin) {
      child.stdin.write(text);
      child.stdin.end();
    }
  });

const clipboardCommands = () => {
  switch (process.platform) {
    case "darwin":
      return [{ command: "pbcopy", args: [] }];
    case "win32":
      return [{ command: "cmd", args: ["/c", "clip"] }];
    default:
      return [
        { command: "wl-copy", args: [] },
        { command: "xclip", args: ["-selection", "clipboard"] },
        { command: "xsel", args: ["--clipboard", "--input"] },
        { command: "clip.exe", args: [] },
      ];
  }
};

export const copyToClipboard = async (text: string) => {
  const commands = clipboardCommands();
  for (const command of commands) {
    if (await runClipboardCommand(command, text)) {
      return true;
    }
  }
  return false;
};
