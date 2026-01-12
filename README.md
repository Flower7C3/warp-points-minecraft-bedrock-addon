# Warp Points

A Minecraft Bedrock Edition addon that adds a comprehensive warp point system, allowing players to create, manage, and teleport to custom locations with categorized icons.

## Features

- **Create Warp Points**: Set custom warp points at any location with a name, coordinates, and icon
- **Categorized Icons**: Choose from 50+ icons organized into categories:
  - Special Locations (Map Marker, Heart, Spawn)
  - Places (Home, Castle, Hotel, Tower, Lighthouse, Church, Police, Fire Brigade, Government, Bank, Museum, School, Hospital, Offices, Factory, Warehouse)
  - Resources (Coal, Copper, Iron, Redstone, Lapis, Gold, Emerald, Quartz, Diamond, Amethyst, TNT)
  - Farms (Mob Farm, Crop Farm, Animal Farm)
  - Tools & Blocks (Crafting Table, Enchanting Table, Furnace, Chest, and many more)
- **Smart Filtering**: Filter warps by category or view all warps
- **Flexible Sorting**: Sort warps by distance or alphabetically
- **Distance Display**: See the distance to each warp point from your current location
- **Multi-language Support**: English and Polish translations included
- **Custom Commands**: Easy-to-use commands for managing warps
- **Visual UI**: Intuitive form-based interface for creating and managing warps

## Commands

- `/warps add <name> <icon> <x> <y> <z>` - Add a new warp point
- `/warps remove` - Remove a warp point (opens selection menu)
- `/warps` or `/warp` - Open the warp teleportation menu

## Installation

1. Go to the [Releases](../../releases) page
2. Download the latest `.mcaddon` file
3. Open Minecraft Bedrock Edition
4. Go to Settings > Global Resources > My Packs
5. Click "Import" and select the downloaded file
6. Activate the pack in your world

## Usage

### Creating a Warp Point

1. Use the command `/warps add` or interact with the Warp Menu item
2. Select a category for your warp icon
3. Choose an icon from the selected category
4. Enter a name and coordinates for your warp point
5. The warp point is saved and available for teleportation

### Teleporting to Warp Points

1. Use the command `/warps` or `/warp` to open the teleportation menu
2. Filter warps by category or view all warps
3. Sort by distance (default) or alphabetically using the sort button
4. Select a warp point to teleport there instantly

### Removing Warp Points

1. Use the command `/warps remove`
2. Select the warp point you want to remove
3. Confirm the deletion

## Subpacks

The addon includes two subpacks:

- **Craftable Warp Menu: True** - Makes the Warp Menu item craftable
- **Craftable Warp Menu: False** - Warp Menu item is not craftable (default)

## Icons

Some icons used in this addon are sourced from:
- [SVG Repo - Landscapes 23 Collection](https://www.svgrepo.com/collection/landscapes-23/).
- [SVG Repo - Building 4 Collection
](https://www.svgrepo.com/collection/building-4/).

## Technical Details

- **Minecraft Version**: Bedrock Edition 1.17.0+
- **Script API**: @minecraft/server 2.1.0, @minecraft/server-ui 2.0.0
- **Language**: JavaScript
- **Data Storage**: Dynamic Properties (world-level persistence)

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

## Authors

- Flower7C3
- Hajsori

## Repository

[GitHub Repository](https://github.com/Flower7C3/warp-points-minecraft-bedrock-addon)
