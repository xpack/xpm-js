# Other package managers

## [vcpkg](https://github.com/Microsoft/vcpkg)

  - there is no server, the list of available packages is in the `ports` folder.
  - there is a heavy use of `cmake`
  - installing packages results in a folder in `packages and the result is
  also added to `installed/x64-osx` folder,
  with `include` and `lib` below
  - apparently it is not possible to install multiple versions
  - the build differentiates the target
  - the build differentiates debug/release (`x64-osx-dbg` and `x64-osx-rel`)

## [Chocolatey](https://chocolatey.org) 

The package manager for Windows (https://github.com/Microsoft/vcpkg/blob/master/docs/about/faq.md#why-not-chocolatey)

## [Conan](https://conan.io) 

The C / C++ Package Manager for Developers (by JFrog) (https://github.com/Microsoft/vcpkg/blob/master/docs/about/faq.md#why-not-conan)
