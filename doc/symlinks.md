# Windows symbolic links

## Brief

The short version is that Windows does not support symbolic links.

## Problem

NTFS supports only _junctions for directories_ (whatever this can be).

According to tests on a recent (2004, build 19041):

- `mklink /J new old` - creates a directory junction, no admin rights; works on different partitions or volumes, but only locally on the same computer
- `mklink /D new old` - creates a symbolic link, but requires admin rights or developer mode; can point to any file or folder either on the local computer or using a SMB path to point at targets over a network

https://www.2brightsparks.com/resources/articles/NTFS-Hard-Links-Junctions-and-Symbolic-Links.pdf

Rumors say that since Windows 10 Insiders build 14972, symlinks can be created without admin rights (https://blogs.windows.com/windowsdeveloper/2016/12/02/symlinks-windows-10/), but tests on build 19041 did not confirm this.

## Solution

The solution is to use wrappers, to call executables from a different folder.

- shell wrappers for mingw cases
- `.cmd` wrappers for old DOS
- `.ps1` wrappers for new power shell (not yet implemented)
