pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_PROJECT)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "7xCinema-Android-Slice"
include(":app", ":aggregation-core")
project(":aggregation-core").projectDir = file("../prototype/kotlin-aggregation-core")
