#!/usr/bin/env python3
"""
Comprehensive verification script for Minecraft Bedrock Addon
Verifies project structure, files, and build readiness.

Same helper stack as sibling projects (minecraft_check / console_utils).
Texture + translation checks from minecraft_check target block/catalog packs;
this addon uses warps:* lang keys and script-bound icon paths under
textures/icons/, so those two steps are omitted here.
"""
from minecraft_check import MinecraftUtils


def main():
    """Main verification function"""
    MinecraftUtils.verification_summary([
        MinecraftUtils.verify_config,
        MinecraftUtils.verify_manifests,
        MinecraftUtils.verify_project_structure,
        MinecraftUtils.count_project_files,
        MinecraftUtils.verify_blocks,
    ])


if __name__ == "__main__":
    main()
