<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cowork / Claude file-access rules

- The WSL workspace is READ-ONLY from Claude's sandbox. Never attempt Write or Edit tools on this path.
- The bash tool (mcp__workspace__bash) does NOT work in this project — UNC path CWD breaks all commands.
- Claude's outputs folder is NOT on the user's Windows C: drive. Never reference it in user-facing instructions.
- To write files: provide a bash here-doc for the user to run in their Ubuntu (WSL) terminal.
- To run git: provide the git commands for the user to run in their Ubuntu terminal.
- Commit and push after each file is written — do not batch at the end of a session.
