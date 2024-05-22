package_loader <- function(package) {
  if (package %in% installed.packages()) {
    library(package, character.only = TRUE)
  } else {
    install.packages(package)
    library(package, character.only = TRUE)
  }
}

