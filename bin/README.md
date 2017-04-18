# CLI Launchers

Executable JS scripts to start the application when invoked from a shell.

On POSIX, a link with the program name is created in the `.../bin` folder pointing to the script; on Windows, a `.cmd` file is created to start the script with node.

## Multiple identities

If the application must provide different functionality when invoked with different names, multiple scripts must be used, one for each name.

The script name (extension striped) is the program name as seen from the application.
