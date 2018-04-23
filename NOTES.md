
# Windows specifics

Microsoft added support for symbolic links long time ago, but required administrative rights to create them, which makes  symbolic links mostly useless outside tightly controlled environments like install/setup.

## Symbolic links

On Windows 10, by enabling _Developer Mode_ in Settings, it is possible to create symlinks without administrative rights.

Starting processes via symbolic links is possible in Command Prompt.

However there are some differences, since executables accompanied by DLLs fail to find them.

Also `make` is not able to start the compiler properly:

```console
C:\Users\ilg\tmp\xp\build\xp-hifive1-riscv-none-gcc-debug>make all
[riscv-none-embed-gcc]: src/newlib-syscalls.c
riscv-none-embed-gcc: error: CreateProcess: No such file or directory
make: *** [src/subdir.mk:15: src/newlib-syscalls.o] Error 1
```

Otherwise `xpm` is capable of starting programs (like `make` and `riscv-none-embed-gcc`) via links.

TODO: investigate why `make` fails to start processes via symlinks.

## Shims

Without symbolic links, the traditional workaround is to use _shims_, small shell scripts that start the program from the original location, usually relative to the shim location.

For use with the Microsoft shell, the files should be named `xxx.cmd`; for POSIX environments (like mingw/cygwin), the files are regular shell scripts and need no extension. 

However this solution works only for executable files; other types (like DLLs) cannot be linked.

Folders can be 'junctioned' and apparently this is transparent.

Other special cases worth mentioning is `make`. If `make` finds a `sh.exe`, it uses the POSIX shim, otherwise it uses `cmd.exe` which will pick the `.cmd` shim.

## Conclusions

The most annoying issue is that using shims apparently confuses the binaries about their real location.

One possible workaround is to also copy the DLLs and the `sh.exe` to the new destination folder. This has the disadvantage of version clashes between DLLs contributed by different packages.

A better option is to start each executable in an environment which includes its parent folder in the PATH. This helps identify both the local DLLs and the `sh.exe`. Apparently there are no drawbacks.

Anyway, on Windows, even in Developer mode, symbolic links are mostly useless.
