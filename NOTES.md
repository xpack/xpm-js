
# Windows specifics

Microsoft added support for symbolic links long time ago, but required administrative rights to create them, which makes them mostly useless outside tightly controlled environments like install/setup.

## Symbolic links

On Windows 10 with _Developer Mode_ enabled in Settings, it is possible to create symlinks without administrative rights.

Starting processes via symlinks is possible in Command Prompt, but apparently the process thinks it has the location of the link, not of the original file; thus executables accompanied by DLLs fail to find them. The workaround is to link them too.

However, there are still some differences, and, for example, `make` is not able to start the compiler properly:

```console
C:\Users\ilg\tmp\xp\build\xp-hifive1-riscv-none-gcc-debug>make all
[riscv-none-embed-gcc]: src/newlib-syscalls.c
riscv-none-embed-gcc: error: CreateProcess: No such file or directory
make: *** [src/subdir.mk:15: src/newlib-syscalls.o] Error 1
```

Otherwise `xpm` is capable of starting programs (like `make` and `riscv-none-embed-gcc`) via links.

TODO: investigate why `make` fails to start processes via links.

## Shims

Without symlinks, the traditional workaround is to use _shims_, small shell scripts that start the program from the original location, usually relative to the shim location.

For use with the Microsoft shell, the files should be named `xxx.cmd`; for use in mingw/cygwin, the files need no extension.

This solution works only for executable files; other types (like DLLs) cannot be linked, and must be copied.

Folders can be 'junctioned' and apparently this is transparent.

Other special cases worth mentioning is make, which checks for `sh.exe` in the shim folder, so this binary needs to be copied too.

## Conclusions

The most annoying issue is that using shims apparently confuses the binaries about their real location.

The workaround requires the DLLs and the `sh.exe` to be copied to each new destination folder. All other files can be indirectly refered via shims, and folders via 'junctions'.

Even in Developer mode, symlinks are mostly useless.
