import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"
import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    SignSide,
    DyeColor,
    BlockPermutation,
    LocationInUnloadedChunkError
} from "@minecraft/server";

const Warps = () => {
    ///=================================================================================================================
    // === Constants (module scope) ===
    const WORLD_PROP = "warps:data";
    const ITEM_COMPONENT_ID = "warps:warp_menu";

    let dataLoaded = false;

    const isDataLoaded = () => dataLoaded;

    const WarpIcon = (key, category, path) => {
        return {
            name: key,
            path: `textures/icons/${path}`,
            category: category,
            translatedName: `warps:icon.${key}`,
            translatedCategory: `warps:category.${category}`
        };
    }

    const getWarpSignMode = (warp) => {
        const vals = Object.values(SIGN_MODE);
        if (warp.facing === 0 || warp.facing === 1) {
            return vals[warp.facing] || vals[0];
        }
        if (typeof warp.facing === "number" && warp.facing >= 2) {
            return vals[0];
        }
        const sm = warp.signMode;
        if (typeof sm === "string" && vals.includes(sm)) return sm;
        return vals[0];
    };

    const getWarpSignMaterial = (warp) => {
        const vals = Object.values(SIGN_MATERIAL);
        const m = warp.signMaterial;
        if (m === null || m === "" || m === undefined) return vals[0];
        if (typeof m === "string" && vals.includes(m)) return m;
        if (typeof m === "number" && m >= 0 && m < vals.length) return vals[m];
        return vals[0];
    };

    const TRANSLATION_PATTERN = Object.freeze({
        BODY: "[coordsLabel]: §l[coordsValue]§r\n[dimensionLabel]: §l[dimensionName]§r\n[distanceLabel]: §l[distanceKmValue]§r (§l[distanceMetersLocale]§r)\n[directionLabel]: §l[directionText] [directionSign]§r\n[ownerLabel]: §l[ownerName]§r\n[visibilityLabel]: §l[visibilityName]§r\n[categoryLabel]: §l[categoryName]§r\n[iconLabel]: §l[iconName]§r\n[signModeLabel]: §l[signModeValue]§r\n[signMaterialLabel]: §l[signMaterialValue]§r",
        SIGN_TEXT: "❣ §l[warpName]§r ([categoryName])",
        BUTTON_LONG: "[visibilitySymbol] §l[warpName]§r [distanceDirectionValue] [directionSign]",
        BUTTON_SHORT: "[visibilitySymbol] §l[warpName]§r [coordsValue] [dimensionName]",
        LIST_ALL: "[visibilitySymbol] §l[warpName]§r [coordsValue] [dimensionName]",
    })

    // List of available images for warps — organized by categories
    const WARP_ICONS = [
        // === SPECIAL LOCATIONS ===
        // Hearts
        WarpIcon("Heart_Full", "special", "hearts/full.png"),
        WarpIcon("Heart_Absorbing", "special", "hearts/absorbing_full.png"),
        WarpIcon("Heart_Frozen", "special", "hearts/frozen_full.png"),
        WarpIcon("Heart_Hardcore", "special", "hearts/hardcore_full.png"),
        // Markers
        WarpIcon("Marker_Blue", "special", "map/blue_marker.png"),
        WarpIcon("Marker_Red", "special", "map/red_marker.png"),
        WarpIcon("Marker_White", "special", "map/white_marker.png"),
        WarpIcon("Marker_Yellow", "special", "map/yellow_marker.png"),
        // X/Target
        WarpIcon("Target_Point", "special", "map/target_point.png"),
        WarpIcon("Target_X", "special", "map/target_x.png"),

        // Minecraft Villages
        WarpIcon("Plains_Village", "villages", "village/plains_village.png"),
        WarpIcon("Desert_Village", "villages", "village/desert_village.png"),
        WarpIcon("Jungle_Temple", "villages", "village/jungle_temple.png"),
        WarpIcon("Savanna_Village", "villages", "village/savanna_village.png"),
        WarpIcon("Snowy_Village", "villages", "village/snowy_village.png"),
        WarpIcon("Taiga_Village", "villages", "village/taiga_village.png"),

        // Minecraft Places
        WarpIcon("Ocean_Monument", "villages", "village/ocean_monument.png"),

        // === BUILDINGS ===
        WarpIcon("Police", "buildings", "buildings/city/police.png"),
        WarpIcon("Fireman", "buildings", "buildings/city/fireman.png"),
        WarpIcon("Health-clinic", "buildings", "buildings/city/health-clinic.png"),
        WarpIcon("Officials", "buildings", "buildings/city/officials.png"),
        WarpIcon("School", "buildings", "buildings/city/school.png"),
        WarpIcon("Museum", "buildings", "buildings/city/museum.png"),
        WarpIcon("Shop", "buildings", "buildings/city/shop.png"),
        WarpIcon("Workplace", "buildings", "buildings/city/workplace.png"),
        WarpIcon("Factory", "buildings", "buildings/city/factory.png"),
        WarpIcon("Statue", "buildings", "buildings/city/statue.png"),
        WarpIcon("Lighthouse", "buildings", "buildings/city/lighthouse.png"),

        WarpIcon("Home", "buildings", "buildings/houses/home.png"),
        WarpIcon("Mansion", "buildings", "buildings/houses/mansion.png"),
        WarpIcon("Castle", "buildings", "buildings/houses/castle.png"),
        WarpIcon("Flat", "buildings", "buildings/houses/flat.png"),
        WarpIcon("Skyscraper", "buildings", "buildings/houses/skyscraper.png"),
        WarpIcon("Garage", "buildings", "buildings/houses/garage.png"),

        WarpIcon("Christian-church", "buildings", "buildings/religion/christian-church.png"),
        WarpIcon("Orthodoxian-church", "buildings", "buildings/religion/orthodoxian-church.png"),
        WarpIcon("Synagogue", "buildings", "buildings/religion/synagogue.png"),

        // === CITY ===
        WarpIcon("Cityscape_Futuristic", "cityscapes", "landscapes-23/cityscape-futuristic.png"),
        WarpIcon("Street", "cityscapes", "landscapes-23/street.png"),
        WarpIcon("Park", "cityscapes", "landscapes-23/park.png"),
        WarpIcon("Amusement_Park", "cityscapes", "landscapes-23/amusement-park.png"),

        // === LANDSCAPES ===
        // Nature
        WarpIcon("Road", "cityscapes", "landscapes-23/road.png"),
        WarpIcon("Forest", "landscapes", "landscapes-23/forest.png"),
        WarpIcon("Rainforest", "landscapes", "landscapes-23/rainforest.png"),
        WarpIcon("Bushes_Bush", "landscapes", "landscapes-23/bushes-bush.png"),
        WarpIcon("Savannah", "landscapes", "landscapes-23/savannah.png"),
        WarpIcon("Desert", "landscapes", "landscapes-23/desert.png"),
        WarpIcon("Mountains", "landscapes", "landscapes-23/mountains-mountain.png"),
        WarpIcon("Ruins_Ancient", "landscapes", "landscapes-23/ruins-ancient.png"),

        // Water
        WarpIcon("River", "waterscapes", "landscapes-23/river.png"),
        WarpIcon("Bridge_River", "waterscapes", "landscapes-23/bridge-river.png"),
        WarpIcon("Waterfall_River", "waterscapes", "landscapes-23/waterfall-river.png"),
        WarpIcon("Lake", "waterscapes", "landscapes-23/lake.png"),

        // Sea
        WarpIcon("Beach_Sea", "waterscapes", "landscapes-23/beach-sea.png"),
        WarpIcon("Sea_Boat", "waterscapes", "landscapes-23/sea-boat.png"),
        WarpIcon("Island", "waterscapes", "landscapes-23/island.png"),

        // === RESOURCES === (sorted from most common to rarest)
        WarpIcon("Coal", "resources", "ore/Coal.png"),
        WarpIcon("Copper", "resources", "ore/Copper.png"),
        WarpIcon("Iron", "resources", "ore/Iron.png"),
        WarpIcon("Redstone", "resources", "ore/Redstone.png"),
        WarpIcon("Lapis", "resources", "ore/Lapis.png"),
        WarpIcon("Gold", "resources", "ore/Gold.png"),
        WarpIcon("Emerald", "resources", "ore/Emerald.png"),
        WarpIcon("Quartz", "resources", "ore/Quartz.png"),
        WarpIcon("Diamond", "resources", "ore/Diamond.png"),
        WarpIcon("Amethyst", "resources", "ore/Amethyst.png"),
        WarpIcon("TNT", "resources", "ore/TNT.png"),
    ]

    const WARP_MENU = Object.freeze({
        TELEPORT: 'teleport',
        MANAGEMENT: 'management'
    });

    const SORT_BY = Object.freeze({
        DISTANCE: 'distance',
        ALPHABETICAL: 'alphabetical'
    });

    const WARP_VISIBILITY = Object.freeze({
        PRIVATE: 'private',
        PROTECTED: 'protected',
        PUBLIC: 'public'
    });

    const SIGN_MODE = Object.freeze({
        AUTOMATIC_NORTH_SOUTH: 'north_south',
        AUTOMATIC_EAST_WEST: 'east_west',
        STANDING_NORTH_SOUTH: 'standing_north_south',
        STANDING_EAST_WEST: 'standing_east_west',
        HANGING_NORTH_SOUTH: 'hanging_north_south',
        HANGING_EAST_WEST: 'hanging_east_west',
        WALL_NORTH: 'wall_north',
        WALL_SOUTH: 'wall_south',
        WALL_EAST: 'wall_east',
        WALL_WEST: 'wall_west',
    })

    const SIGN_MATERIAL = Object.freeze({
        OAK: 'oak',
        PALE_OAK: 'pale_oak',
        DARK_OAK: 'dark_oak',
        SPRUCE: 'spruce',
        BIRCH: 'birch',
        JUNGLE: 'jungle',
        ACACIA: 'acacia',
        MANGROVE: 'mangrove',
        CHERRY: 'cherry',
        CRIMSON: 'crimson',
        BAMBOO: 'bamboo',
        WARPED: 'warped',
    });

    ///=================================================================================================================
    // === Data Management Functions ===
    const loadWarps = () => {
        const saved = Minecraft.world.getDynamicProperty(WORLD_PROP)?.toString();
        if (!saved) {
            if (!isDataLoaded()) {
                dataLoaded = true;
            }
            return [];
        }
        try {
            const warps = JSON.parse(saved);
            // Migration: add owner and visibility to existing warps
            const mapped = warps.map(warp => {
                if (!warp.owner) {
                    warp.owner = ""; // Unknown owner for old warps
                }
                if (!warp.visibility) {
                    warp.visibility = WARP_VISIBILITY.PUBLIC;
                }
                if (!warp.signMode) {
                    warp.signMode = getWarpSignMode(warp);
                }
                if (!warp.signMaterial) {
                    warp.signMaterial = Object.values(SIGN_MATERIAL)[0];
                }
                return warp;
            });
            if (!isDataLoaded()) {
                dataLoaded = true;
            }
            return mapped;
        } catch {
            if (!isDataLoaded()) {
                dataLoaded = true;
            }
            return [];
        }
    }

    const getValidWarps = () => {
        return loadWarps().filter(warp =>
            warp?.name &&
            warp?.x !== undefined &&
            warp?.y !== undefined &&
            warp?.z !== undefined &&
            warp?.dimension
        );
    }

    const SAVE_ACTION = Object.freeze({
        CREATE: 'create',
        UPDATE: 'update',
        DELETE: 'delete'
    })

    const saveWarps = (player, action, warps, warp, translateKey, translateParams = []) => {
        const json = JSON.stringify(warps);
        Minecraft.world.setDynamicProperty(WORLD_PROP, json);

        let soundId;
        switch (action) {
            case SAVE_ACTION.CREATE:
                soundId = "beacon.activate"
                player.dimension.runCommand(`summon fireworks_rocket ${warp.x} ${warp.y} ${warp.z}`);
                updateWarpSigns();
                break;
            case SAVE_ACTION.UPDATE:
                soundId = "beacon.power"
                player.dimension.runCommand(`particle minecraft:witchspell_emitter ${warp.x} ${warp.y} ${warp.z}`);
                updateWarpSign(warp);
                showWarpDetailsMenu(player, warp);
                break;
            case SAVE_ACTION.DELETE:
                soundId = "beacon.deactivate"
                player.dimension.runCommand(`particle minecraft:critical_hit_emitter ${warp.x} ${warp.y} ${warp.z}`);
                removeWarpSign(warp);
                break;
        }

        if (soundId) {
            player.playSound(soundId, player.location);
        }

        // Format parameters for rawtext
        const formattedParams = translateParams.map(param => {
            // If param is already an object with rawtext, return it
            if (typeof param === 'object' && param.rawtext) {
                return param;
            }
            // If param is an object with translate or text, return it directly
            if (typeof param === 'object' && (param.translate || param.text)) {
                return param;
            }
            // If param is a string or number, wrap in text
            return {text: param.toString()};
        });

        player.sendMessage({
            rawtext: [{
                translate: translateKey,
                with: {
                    rawtext: formattedParams
                }
            }]
        });
    }


    ///=================================================================================================================
    // === Player Functions ===
    const getPlayer = (origin) => {
        if (origin.sourceType === Minecraft.CustomCommandSource.Entity && origin.sourceEntity.typeId === "minecraft:player") {
            return origin.sourceEntity;
        }
        if (origin.sourceType === Minecraft.CustomCommandSource.NPCDialogue && origin.initiator.typeId === "minecraft:player") {
            return origin.initiator;
        }
        return null;
    }

    const getPlayerDimension = (player) => player.dimension.id.replace("minecraft:", "");

    const roundLocation = (location) => ({
        x: Math.round(location.x),
        y: Math.round(location.y),
        z: Math.round(location.z)
    })

    const calculateDistance = (x1, y1, z1, x2, y2, z2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    ///=================================================================================================================
    // === Categories and icons Functions ===

    const getCategories = () => {
        const categories = new Set();
        WARP_ICONS.forEach(icon => {
            if (icon && icon.category) {
                categories.add(icon.category);
            }
        });
        return Array.from(categories);
    }

    const getIcons = () => {
        const icons = new Set();
        WARP_ICONS.forEach(icon => {
            if (icon) {
                icons.add(icon);
            }
        });
        return Array.from(icons);
    }

    const getIconsByCategory = (categoryKey) => {
        return WARP_ICONS.filter(icon => icon && icon.category === categoryKey);
    }

    const getIconByName = (iconKey) => WARP_ICONS.find(icon => icon && icon.name === iconKey);

    const getCategoriesWithWarps = (warps) => getCategories()
        .filter(categoryKey =>
            warps.some(warp => {
                const icon = getIconByName(warp.icon);
                return icon && icon.category === categoryKey;
            })
        );


    const getIconsWithWarps = (warps) => getIcons()
        .filter(icon =>
            warps.some(warp => warp.icon === icon.name)
        );

    ///=================================================================================================================
    // === Warp Functions ===
    const filterWarpsByCategory = (warps, categoryKey) => {
        if (!categoryKey) return warps;
        return warps.filter(warp => {
            const icon = getIconByName(warp.icon);
            return icon && icon.category === categoryKey;
        });
    }

    const filterWarpsByIcon = (warps, iconKey) => {
        if (!iconKey) return warps;
        return warps.filter(warp => warp.icon === iconKey);
    }

    const filterWarpsByVisibility = (warps, player) => {
        return warps.filter(warp => canPlayerSeeWarp(player, warp));
    }


    const sortWarps = (warps, sortBy, player) => {
        const sorted = [...warps];
        switch (sortBy) {
            case SORT_BY.DISTANCE:
                const playerLocation = player.location;
                const playerDimension = getPlayerDimension(player);
                sorted.sort((a, b) => {
                    const aSameDimension = a.dimension === playerDimension;
                    const bSameDimension = b.dimension === playerDimension;
                    if (aSameDimension && !bSameDimension) return -1;
                    if (!aSameDimension && bSameDimension) return 1;
                    if (aSameDimension && bSameDimension) {
                        const distA = calculateDistance(playerLocation.x, playerLocation.y, playerLocation.z, a.x, a.y, a.z);
                        const distB = calculateDistance(playerLocation.x, playerLocation.y, playerLocation.z, b.x, b.y, b.z);
                        return distA - distB;
                    }
                    return 0;
                });
                break;
            case SORT_BY.ALPHABETICAL:
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }
        return sorted;
    }

    const getWarpByName = (warpName) => {
        const warps = getValidWarps();
        const warp = warps.find(w => w.name.toLowerCase() === warpName.toLowerCase());
        return warp || null;
    }

    const getWarpByLocation = (x, y, z, dimensionId) => {
        const warps = getValidWarps();
        const warp = warps.find(w =>
            w.x === x &&
            w.y === y &&
            w.z === z &&
            w.dimension === dimensionId
        );
        return warp || null;
    }

    const getDimensionByName = (dimensionId) => Minecraft.world.getDimension(`minecraft:${dimensionId}`);

    const getWarpDetails = (warp, player, pattern) => {
        const visibility = (warp.visibility === null || warp.visibility === "" || warp.visibility === undefined)
            ? WARP_VISIBILITY.PUBLIC
            : warp.visibility;

        const iconKey = (warp && typeof warp.icon === "string") ? warp.icon : null;
        const icon = getIconByName(iconKey);


        const dim = (warp.dimension != null && String(warp.dimension)) ? String(warp.dimension) : "overworld";

        const keys = {
            nameLabel: {translate: `warps:field.name.label`},
            warpName: {text: (warp.name != null ? String(warp.name) : "?")},
            coordsLabel: {translate: `warps:field.coords.label`},
            coordsValue: {text: `${warp.x ?? "?"}, ${warp.y ?? "?"}, ${warp.z ?? "?"}`},
            dimensionLabel: {translate: `warps:field.dimension.label`},
            dimensionName: {translate: `warps:dimension.${dim}`},
            ownerLabel: {translate: `warps:field.owner.label`},
            ownerName: (warp.owner === null || warp.owner === "" || warp.owner === undefined)
                ? {text: "?"}
                : {text: warp.owner},
            visibilityLabel: {translate: `warps:field.visibility.label`},
            visibilityName: {translate: `warps:visibility.state.${visibility}.label`},
            visibilitySymbol: visibility
                ? {translate: `warps:visibility.state.${visibility}.symbol`}
                : {text: ""},
            categoryLabel: {translate: `warps:field.category.label`},
            categoryName: (icon.translatedCategory && typeof icon.translatedCategory === "string")
                ? {translate: icon.translatedCategory}
                : {text: "?"},
            iconLabel: {translate: `warps:field.icon.label`},
            iconName: (icon.translatedName && typeof icon.translatedName === "string")
                ? {translate: icon.translatedName}
                : {text: iconKey},
            signModeLabel: {translate: "warps:field.sign_mode.label"},
            signModeValue: {translate: `warps:field.sign_mode.value.${getWarpSignMode(warp)}`},
            signMaterialLabel: {translate: "warps:field.sign_material.label"},
            signMaterialValue: {translate: `warps:field.sign_material.value.${getWarpSignMaterial(warp)}`},
        }

        if (player && warp.dimension === getPlayerDimension(player)) {
            const DIRECTION_NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
            const DIRECTION_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
            const playerLocation = player.location;
            const distance = calculateDistance(playerLocation.x, playerLocation.y, playerLocation.z, warp.x, warp.y, warp.z);
            const suffix = (distance >= 5) ? "5" : ((5 > distance && distance > 1) ? "2" : "1");
            const dx = warp.x - playerLocation.x;
            const dz = warp.z - playerLocation.z;
            let angleToWarp = (Math.atan2(dx, -dz) * 180 / Math.PI);
            if (angleToWarp < 0) angleToWarp += 360;
            const playerAtWarpLocation = (-1 < dx && dx < 1 && -1 < dz && dz < 1);
            const directionText = playerAtWarpLocation
                ? "warps:direction.value_on_place"
                : `warps:direction.value_${DIRECTION_NAMES[Math.round(angleToWarp / 45) % 8]}`;
            const rotation = player.getRotation();
            const playerYaw = (typeof rotation.y === "number") ? rotation.y : 0;
            const playerFacingDeg = (180 + playerYaw + 360) % 360;
            const relativeDeg = (angleToWarp - playerFacingDeg + 360) % 360;
            const directionSign = playerAtWarpLocation
                ? "·"
                : DIRECTION_ARROWS[Math.round(relativeDeg / 45) % 8];

            keys.distanceLabel = {translate: `warps:field.distance.label`};
            keys.distanceKmValue = {
                translate: `warps:distance.value_km`,
                with: {rawtext: [{text: (distance / 1000).toFixed(2).toString()}]}
            };
            keys.distanceMetersValue = {
                translate: `warps:distance.value_m`,
                with: {rawtext: [{text: Math.round(distance).toString()}]}
            };
            keys.distanceMetersLocale = {
                translate: `warps:distance.value_${suffix}`,
                with: {rawtext: [{text: Math.round(distance).toString()}]}
            };
            keys.distanceDirectionValue = {
                translate: `warps:distance_direction.value_m`,
                with: {rawtext: [{text: Math.round(distance).toString()}, {translate: directionText}]}
            };
            keys.directionLabel = {translate: `warps:field.direction.label`};
            keys.directionText = {translate: directionText};
            keys.directionSign = {text: directionSign};
        } else {
            keys.distanceLabel = {translate: `warps:field.distance.label`};
            keys.distanceKmValue = {text: "—"};
            keys.distanceMetersValue = {text: "—"};
            keys.distanceMetersLocale = {text: "—"};
            keys.distanceDirectionValue = {text: "—"};
            keys.directionLabel = {translate: `warps:field.direction.label`};
            keys.directionText = {text: "—"};
            keys.directionSign = {text: ""};
        }

        const parts = [];
        const regex = /\[([^\]]+)\]/g;
        let lastEnd = 0;
        let m;
        while ((m = regex.exec(pattern)) !== null) {
            if (m.index > lastEnd) {
                const literal = pattern.slice(lastEnd, m.index);
                if (literal.length > 0) {
                    parts.push({text: literal});
                }
            }
            const key = m[1];
            if (keys[key] !== undefined) {
                parts.push(keys[key]);
            }
            lastEnd = m.index + m[0].length;
        }
        if (lastEnd < pattern.length) {
            const literal = pattern.slice(lastEnd);
            if (literal.length > 0) {
                parts.push({text: literal});
            }
        }

        return {rawtext: parts};
    }

    ///=================================================================================================================
    // === Visibility Functions ===

    const getVisibilityIndex = (visibility) => {
        switch (visibility) {
            case WARP_VISIBILITY.PRIVATE:
                return 0;
            case WARP_VISIBILITY.PROTECTED:
                return 1;
            case WARP_VISIBILITY.PUBLIC:
                return 2;
            default:
                return 1;
        }
    }

    const getVisibilityByIndex = (index) => {
        switch (index) {
            case 0:
                return WARP_VISIBILITY.PRIVATE;
            case 1:
                return WARP_VISIBILITY.PROTECTED;
            case 2:
                return WARP_VISIBILITY.PUBLIC;
            default:
                return WARP_VISIBILITY.PROTECTED;
        }
    }

    ///=================================================================================================================
    // === Security Functions ===

    const canPlayerSeeWarp = (player, warp) => {
        if (!warp.visibility) return true; // For old warps without visibility
        if (warp.visibility === WARP_VISIBILITY.PUBLIC || warp.visibility === WARP_VISIBILITY.PROTECTED) {
            return true;
        }
        if (warp.visibility === WARP_VISIBILITY.PRIVATE) {
            return warp.owner === player.name;
        }
        return true;
    }

    const WARPS_ADMIN_TAG = "warpsAdmin";

    const canPlayerEditWarp = (player, warp) => {
        if (player.hasTag && player.hasTag(WARPS_ADMIN_TAG)) return true;
        if (!warp.owner) return true; // For old warps without owner
        if (warp.visibility === WARP_VISIBILITY.PUBLIC) {
            return true; // Everyone can edit public warps
        }
        return warp.owner === player.name; // Only owner can edit protected and private
    }


    ///=================================================================================================================
    // === Search & Teleport Functions ===

    /** Returns visible warps whose name (case-insensitive) contains the query. Sorted: exact match first, then startsWith, then contains. */
    const searchWarpsByQuery = (player, query) => {
        if (!player || !query || typeof query !== "string") return [];
        const q = query.trim().toLowerCase();
        if (q === "") return [];
        const warps = filterWarpsByVisibility(getValidWarps(), player);
        const matching = warps.filter(w => w.name && w.name.toLowerCase().includes(q));
        // Sort: exact match first, then name starts with query, then rest (by name)
        matching.sort((a, b) => {
            const aLower = a.name.toLowerCase();
            const bLower = b.name.toLowerCase();
            const aExact = aLower === q ? 0 : 1;
            const bExact = bLower === q ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
            const aStarts = aLower.startsWith(q) ? 0 : 1;
            const bStarts = bLower.startsWith(q) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            return a.name.localeCompare(b.name);
        });
        return matching;
    }

    const teleportToWarpByName = (player, warpName) => {
        if (!player || !warpName) {
            return;
        }

        const query = warpName.trim();
        const warps = filterWarpsByVisibility(getValidWarps(), player);
        const exactMatch = warps.find(w => w.name && w.name.toLowerCase() === query.toLowerCase());

        if (exactMatch) {
            teleportToWarp(player, exactMatch);
            return;
        }

        const matching = searchWarpsByQuery(player, query);
        if (matching.length === 0) {
            return player.sendMessage({translate: "warps:error.warp_name_not_found", with: [query]});
        }

        const defaultSortBy = SORT_BY.ALPHABETICAL;
        showWarpsListMenuWithOptions(player, matching, defaultSortBy, WARP_MENU.TELEPORT, null, null, matching, query);
    }

    const teleportToWarp = (player, warp) => {
        try {
            const dimension = getDimensionByName(warp.dimension);
            dimension.runCommand(`tp "${player.name}" ${warp.x} ${warp.y} ${warp.z}`);
            player.playSound("mob.shulker.teleport", {x: warp.x, y: warp.y, z: warp.z});
        } catch (error) {
            console.error(`[WARP] Error teleporting to warp ${warp.name}:`, error);
            player.sendMessage({
                translate: "warps:teleport.error",
                with: [warp.name]
            });
        }
    }

    ///=================================================================================================================
    // === Menu Functions ===

    /**
     * Lista ikon: wszystkich (z podziałem na kategorie), w kategorii, lub wg wyszukiwania (z podziałem na kategorie).
     * query !== null = tryb wyszukiwania (warps = wyniki wyszukiwania).
     */
    const showSubcategoriesMenu = (player, warps, sortBy, mode = WARP_MENU.TELEPORT, selectedCategory, selectedIcon = null, query = null) => {
        const iconsWithWarps = getIconsWithWarps(warps);
        const isSearchMode = query !== null && query !== undefined;

        if (iconsWithWarps.length === 0) {
            if (isSearchMode) {
                player.sendMessage({translate: "warps:search_results.no_icons_in_results"});
                showWarpsListMenuWithOptions(player, warps, sortBy, mode, null, null, warps, query);
            } else {
                showWarpsListMenuWithOptions(player, warps, sortBy, mode, selectedCategory, selectedIcon, null, null);
            }
            return;
        }

        const hasFirstButton = true;
        const subForm = new MinecraftUi.ActionFormData();

        if (isSearchMode) {
            subForm.title({
                rawtext: [{translate: "warps:search_results.title", with: {rawtext: [{text: query}]}}]
            });
        } else {
            subForm.title({
                rawtext: [{
                    translate: (mode === WARP_MENU.TELEPORT) ? "warps:teleport_menu.title" : "warps:manage_menu.title"
                }]
            });
        }

        subForm.body("");

        const BUTTON_BACK = 0;
        if (selectedCategory) {
            subForm.button({
                rawtext: [{
                    translate: "warps:menu.filter_all_in_category",
                    with: {rawtext: [{translate: `warps:category.${selectedCategory}`}]}
                }]
            });
            subForm.label({
                rawtext: [{
                    translate: "warps:menu.filter.or_select_icon_from_category",
                    with: {rawtext: [{translate: `warps:category.${selectedCategory}`}]}
                }]
            });
        } else {
            subForm.button({
                rawtext: [{translate: "warps:menu.filter_all"}]
            });
            subForm.label({
                rawtext: [{translate: "warps:menu.filter.select_icon"}]
            });
        }

        let categoryName = null;
        iconsWithWarps.forEach(icon => {
            if (icon.category !== categoryName && !selectedCategory) {
                subForm.label({rawtext: [{translate: `warps:category.${icon.category}`}]});
                categoryName = icon.category;
            }
            subForm.button({
                rawtext: [{translate: icon.translatedName}]
            }, icon.path || "");
        });

        subForm.show(player).then((subRes) => {
            if (subRes.canceled) {
                if (isSearchMode) {
                    showWarpsListMenuWithOptions(player, warps, sortBy, mode, null, null, warps, query);
                } else {
                    showWarpsListMenuWithOptions(player, warps, sortBy, mode, selectedCategory, null, null, null);
                }
                return;
            }
            if (hasFirstButton && subRes.selection === BUTTON_BACK) {
                if (isSearchMode) {
                    showWarpsListMenuWithOptions(player, warps, sortBy, mode, null, null, warps, query);
                } else {
                    showWarpsListMenuWithOptions(player, warps, sortBy, mode, selectedCategory, null, null, null);
                }
                return;
            }
            const iconIndex = hasFirstButton ? subRes.selection - 1 : subRes.selection;
            if (iconIndex >= 0 && iconIndex < iconsWithWarps.length) {
                const chosenIcon = iconsWithWarps[iconIndex];
                const filteredWarps = filterWarpsByIcon(warps, chosenIcon.name);
                const categoryForChosenIcon = selectedCategory || chosenIcon.category || null;
                if (isSearchMode) {
                    showWarpsListMenuWithOptions(player, filteredWarps, sortBy, mode, categoryForChosenIcon, chosenIcon, warps, query);
                } else {
                    showWarpsListMenuWithOptions(player, filteredWarps, sortBy, mode, categoryForChosenIcon, chosenIcon, warps, null);
                }
            }
        });
    }

    /**
     * Wybór kategorii: pierwsza pozycja "Wszystkie", potem lista kategorii.
     * Pokazuje tylko kategorie mające warpy w bieżącym kontekście (pełna lista lub wyniki wyszukiwania).
     */
    const showCategoryPickerMenu = (player, warps, sortBy, mode = WARP_MENU.TELEPORT, selectedCategory, selectedIcon, categoryWarps, query, allWarpsForCategories = null) => {
        const isSearchMode = query !== null && query !== undefined;
        const fullList = isSearchMode ? warps : (allWarpsForCategories ?? categoryWarps ?? warps);
        const categoriesWithWarps = getCategoriesWithWarps(fullList);

        const form = new MinecraftUi.ActionFormData();
        if (isSearchMode) {
            form.title({rawtext: [{translate: "warps:search_results.title", with: {rawtext: [{text: query}]}}]});
        } else {
            form.title({
                rawtext: [{translate: (mode === WARP_MENU.TELEPORT) ? "warps:teleport_menu.title" : "warps:manage_menu.title"}]
            });
        }
        form.body("");
        form.button({rawtext: [{translate: "warps:menu.filter_all"}]});
        form.label({rawtext: [{translate: "warps:menu.or_select_category_from_list"}]});
        categoriesWithWarps.forEach(category => {
            form.button({
                rawtext: [{
                    translate: "warps:menu.filter_category",
                    with: {rawtext: [{translate: `warps:category.${category}`}]}
                }]
            });
        });

        form.show(player).then((res) => {
            if (res.canceled) {
                showWarpsListMenuWithOptions(player, warps, sortBy, mode, selectedCategory, selectedIcon, categoryWarps, query);
                return;
            }
            if (res.selection === 0) {
                showWarpsListMenuWithOptions(player, fullList, sortBy, mode, null, null, null, query);
                return;
            }
            const categoryIndex = res.selection - 1;
            if (categoryIndex >= 0 && categoryIndex < categoriesWithWarps.length) {
                const chosenCategory = categoriesWithWarps[categoryIndex];
                const filteredByCategory = filterWarpsByCategory(fullList, chosenCategory);
                showWarpsListMenuWithOptions(player, filteredByCategory, sortBy, mode, chosenCategory, null, fullList, query);
            }
        });
    }

    const showWarpsListMenuWithOptions = (player, warps, sortBy, mode = WARP_MENU.TELEPORT, selectedCategory = null, selectedIcon = null, categoryWarps = null, query = null) => {
        const isSearchMode = query !== null && query !== undefined;
        const displayWarps = warps;
        const sortedWarps = sortWarps([...filterWarpsByVisibility(displayWarps, player)], sortBy, player);

        const actionForm = new MinecraftUi.ActionFormData();

        if (isSearchMode) {
            actionForm
                .title({
                    rawtext: [{translate: "warps:search_results.title", with: {rawtext: [{text: query}]}}]
                });
        } else {
            actionForm
                .title({
                    rawtext: [{
                        translate: (mode === WARP_MENU.TELEPORT) ? "warps:teleport_menu.title" : "warps:manage_menu.title"
                    }]
                });
        }

        const iconObj = selectedIcon && typeof selectedIcon === "object" ? selectedIcon : (selectedIcon ? getIconByName(selectedIcon) : null);
        const categoryKey = selectedCategory ? `warps:category.${selectedCategory}` : (iconObj && iconObj.category ? `warps:category.${iconObj.category}` : null);

        actionForm.body("");

        const BUTTON_FILTER_CATEGORY = 0;
        const BUTTON_FILTER_ICON = 1;
        const BUTTON_SORT = 2;
        const categoryButtonText = selectedCategory
            ? {
                rawtext: [{
                    translate: "warps:menu.button_category_current",
                    with: {rawtext: [{translate: categoryKey}]}
                }]
            }
            : {rawtext: [{translate: "warps:menu.filter_by_category"}]};
        const iconButtonText = selectedIcon && iconObj
            ? {
                rawtext: [{
                    translate: "warps:menu.button_icon_current",
                    with: {rawtext: [{translate: iconObj.translatedName}]}
                }]
            }
            : {rawtext: [{translate: "warps:menu.filter_by_icon"}]};
        const sortButtonText = {rawtext: [{translate: sortBy === SORT_BY.DISTANCE ? "warps:menu.meta_sort_distance" : "warps:menu.meta_sort_alphabetical"}]};
        actionForm
            .button(categoryButtonText)
            .button(iconButtonText)
            .button(sortButtonText)
            .divider();

        sortedWarps.forEach(warp => {
            try {
                const buttonTranslationPattern = sortBy === SORT_BY.DISTANCE ? TRANSLATION_PATTERN.BUTTON_LONG : TRANSLATION_PATTERN.BUTTON_SHORT;
                const icon = getIconByName(warp.icon);
                actionForm.button(
                    getWarpDetails(warp, player, buttonTranslationPattern),
                    icon && icon.path ? icon.path : ""
                );
            } catch (error) {
                console.error(`[WARP] Error creating button for warp ${warp.name}:`, error);
            }
        });

        actionForm.show(player).then((res) => {
            if (res.canceled) return;

            if (res.selection === BUTTON_FILTER_CATEGORY) {
                const allWarpsForCategories = filterWarpsByVisibility(getValidWarps(), player);
                showCategoryPickerMenu(player, warps, sortBy, mode, selectedCategory, selectedIcon, categoryWarps, query, allWarpsForCategories);
                return;
            }

            if (res.selection === BUTTON_FILTER_ICON) {
                const categoryForIconList = selectedCategory || (iconObj && iconObj.category) || null;
                const warpsForIconList = categoryForIconList
                    ? filterWarpsByCategory(categoryWarps !== null ? categoryWarps : warps, categoryForIconList)
                    : warps;
                showSubcategoriesMenu(player, warpsForIconList, sortBy, mode, categoryForIconList, selectedIcon, query);
                return;
            }

            if (res.selection === BUTTON_SORT) {
                const newSortBy = sortBy === SORT_BY.DISTANCE ? SORT_BY.ALPHABETICAL : SORT_BY.DISTANCE;
                showWarpsListMenuWithOptions(player, warps, newSortBy, mode, selectedCategory, selectedIcon, categoryWarps, query);
                return;
            }

            const warpIndex = res.selection - 3;
            if (warpIndex >= 0 && warpIndex < sortedWarps.length) {
                const selectedWarp = sortedWarps[warpIndex];
                if (mode === WARP_MENU.TELEPORT || isSearchMode) {
                    teleportToWarp(player, selectedWarp);
                } else {
                    showWarpDetailsMenu(player, selectedWarp);
                }
            }
        });
    }

    const showWarpDetailsMenu = (player, warp) => {
        const icon = getIconByName(warp.icon);
        const optionsForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body("")
            .button({
                rawtext: [{translate: "warps:warp_details.options.teleport"}]
            }, icon ? icon.path : "")
            .label(
                getWarpDetails(warp, player, TRANSLATION_PATTERN.BODY)
            );
        const canEdit = canPlayerEditWarp(player, warp);

        const BUTTON_TELEPORT = 0;
        let buttonIndex = 1;

        if (canEdit) {
            const BUTTON_EDIT_NAME = buttonIndex++;
            const BUTTON_EDIT_COORDINATES = buttonIndex++;
            const BUTTON_EDIT_ICON = buttonIndex++;
            const hasVisibilityButton = warp.visibility !== WARP_VISIBILITY.PUBLIC;
            const BUTTON_CHANGE_VISIBILITY = hasVisibilityButton ? buttonIndex++ : -1;
            const BUTTON_DELETE = buttonIndex++;

            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_name"}]
            });
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_coordinates"}]
            });
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_icon"}]
            });
            if (hasVisibilityButton) {
                optionsForm.button({
                    rawtext: [{translate: "warps:warp_details.options.change_visibility"}]
                });
            }
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.delete"}]
            });

            optionsForm.show(player).then((res) => {
                if (res.canceled) {
                    return;
                }

                if (res.selection === BUTTON_TELEPORT) {
                    teleportToWarp(player, warp);
                    return;
                }

                switch (res.selection) {
                    case BUTTON_EDIT_NAME:
                        editWarpNameForm(player, warp);
                        break;
                    case BUTTON_EDIT_COORDINATES:
                        editWarpCoordinatesForm(player, warp);
                        break;
                    case BUTTON_EDIT_ICON:
                        editWarpIconFormStep1(player, warp);
                        break;
                    case BUTTON_CHANGE_VISIBILITY:
                        editWarpVisibilityForm(player, warp);
                        break;
                    case BUTTON_DELETE:
                        removeWarpItemForm(player, warp);
                        break;
                }
            });
        } else {
            optionsForm.show(player).then((res) => {
                if (res.canceled) {
                    return;
                }

                if (res.selection === BUTTON_TELEPORT) {
                    teleportToWarp(player, warp);
                } else {
                    player.sendMessage({translate: "warps:error.no_permission"});
                }
            });
        }
    }


    ///=================================================================================================================
    // === Standing Sign Functions ===

    const WarpSign = (warpDimension, warp) => {
        const signMode = getWarpSignMode(warp);
        // Default for standing type
        let signType;
        let signDirection;

        const SIGN_TYPE = Object.freeze({
            STANDING: 'standing',
            WALL: 'wall',
            HANGING: 'hanging',
        });

        const blockProperties = (signType, signDirection) => {
            let blockProperties = {}
            if (signType === SIGN_TYPE.STANDING) {
                //     // Standing sign: ground_sign_direction (0-15)
                blockProperties = {
                    "ground_sign_direction": signDirection
                }
            } else if (signType === SIGN_TYPE.WALL) {
                // Wall sign: facing_direction (2=north, 3=south, 4=east, 5=west)
                blockProperties = {
                    "facing_direction": signDirection
                }
            } else if (signType === SIGN_TYPE.HANGING) {
                // Hanging sign: facing_direction
                blockProperties = {
                    "facing_direction": signDirection
                }
            }
            return blockProperties
        }

        // Properties
        const signMaterial = getWarpSignMaterial(warp);

        const getSignBlockId = (signMaterial, signType) => {
            // WTF MInecraft?
            if (signMaterial === SIGN_MATERIAL.DARK_OAK && (signType === SIGN_TYPE.STANDING || signType === SIGN_TYPE.WALL)) {
                signMaterial = 'darkoak';
            }
            if (signMaterial === SIGN_MATERIAL.OAK && (signType === SIGN_TYPE.STANDING || signType === SIGN_TYPE.WALL)) {
                return `minecraft:${signType}_sign`
            }
            return `minecraft:${signMaterial}_${signType}_sign`;
        }

        const getSignTextColor = (signMaterial) => {
            // Select text color for readability on different sign types
            switch (signMaterial) {
                case SIGN_MATERIAL.SPRUCE:
                case SIGN_MATERIAL.ACACIA:
                case SIGN_MATERIAL.DARK_OAK:
                case SIGN_MATERIAL.MANGROVE:
                case SIGN_MATERIAL.CRIMSON:
                    return DyeColor.White;
                case SIGN_MATERIAL.WARPED:
                case SIGN_MATERIAL.OAK:
                case SIGN_MATERIAL.PALE_OAK:
                case SIGN_MATERIAL.BIRCH:
                case SIGN_MATERIAL.JUNGLE:
                case SIGN_MATERIAL.CHERRY:
                case SIGN_MATERIAL.BAMBOO:
                    return DyeColor.Black;
                default:
                    return DyeColor.Black;
            }
        }

        const calculateTypeAndDirection = () => {
            if (signMode === SIGN_MODE.AUTOMATIC_NORTH_SOUTH || signMode === SIGN_MODE.AUTOMATIC_EAST_WEST) {
                // Check all directions to find a block to attach the sign to
                const directions = [
                    {
                        facing: (signMode === SIGN_MODE.AUTOMATIC_NORTH_SOUTH ? 2 : 4),
                        offset: {x: 0, y: 1, z: 0},
                        type: SIGN_TYPE.HANGING
                    },
                    {facing: 2, offset: {x: 0, y: 0, z: 1}, type: SIGN_TYPE.WALL}, // north
                    {facing: 3, offset: {x: 0, y: 0, z: -1}, type: SIGN_TYPE.WALL}, // south
                    {facing: 4, offset: {x: 1, y: 0, z: 0}, type: SIGN_TYPE.WALL}, // west
                    {facing: 5, offset: {x: -1, y: 0, z: 0}, type: SIGN_TYPE.WALL}, // east
                ];

                for (const dir of directions) {
                    try {
                        const checkBlock = warpDimension.getBlock({
                            x: warp.x + dir.offset.x,
                            y: warp.y + dir.offset.y,
                            z: warp.z + dir.offset.z
                        });

                        if (checkBlock && checkBlock.typeId !== "minecraft:air" && !checkBlock.typeId.includes("sign")) {
                            signType = dir.type;
                            signDirection = dir.facing;
                            return;
                        }
                    } catch (error) {
                        if (error instanceof LocationInUnloadedChunkError) {
                            // Chunk is not loaded, continue checking other directions
                            continue;
                        }
                        throw error;
                    }
                }

                // fallback default
                signType = SIGN_TYPE.STANDING;
                signDirection = (signMode === SIGN_MODE.AUTOMATIC_NORTH_SOUTH) ? 0 : 4;
            } else {
                if (signMode === SIGN_MODE.STANDING_NORTH_SOUTH) {
                    signType = SIGN_TYPE.STANDING;
                    signDirection = 0;
                } else if (signMode === SIGN_MODE.STANDING_EAST_WEST) {
                    signType = SIGN_TYPE.STANDING;
                    signDirection = 4;
                } else if (signMode === SIGN_MODE.HANGING_NORTH_SOUTH) {
                    signType = SIGN_TYPE.HANGING;
                    signDirection = 2;
                } else if (signMode === SIGN_MODE.HANGING_EAST_WEST) {
                    signType = SIGN_TYPE.HANGING;
                    signDirection = 4;
                } else if (signMode === SIGN_MODE.WALL_NORTH) {
                    signType = SIGN_TYPE.WALL;
                    signDirection = 2;
                } else if (signMode === SIGN_MODE.WALL_SOUTH) {
                    signType = SIGN_TYPE.WALL;
                    signDirection = 3;
                } else if (signMode === SIGN_MODE.WALL_WEST) {
                    signType = SIGN_TYPE.WALL;
                    signDirection = 4;
                } else if (signMode === SIGN_MODE.WALL_EAST) {
                    signType = SIGN_TYPE.WALL;
                    signDirection = 5;
                } else {
                    signType = SIGN_TYPE.STANDING;
                    signDirection = 0;
                }
            }
        }

        calculateTypeAndDirection();

        return {
            blockId: getSignBlockId(signMaterial, signType),
            blockProperties: blockProperties(signType, signDirection),
            isDoubleSide: signType !== SIGN_TYPE.WALL,
            textColor: getSignTextColor(signMaterial),
            text: getWarpDetails(warp, null, TRANSLATION_PATTERN.SIGN_TEXT),
        }
    }

    const updateWarpSigns = () => {
        if (!isDataLoaded()) return;

        const players = Minecraft.world.getPlayers();
        if (players.length === 0) return;

        const warps = getValidWarps();
        const maxDistance = 64;
        const maxDistanceSquared = maxDistance * maxDistance;

        warps.forEach(warp => {
            let shouldUpdate = false;

            for (const player of players) {
                const playerDimension = getPlayerDimension(player);
                if (warp.dimension !== playerDimension) continue;

                const playerLoc = player.location;
                const dx = warp.x - playerLoc.x;
                const dy = warp.y - playerLoc.y;
                const dz = warp.z - playerLoc.z;
                const distanceSquared = dx * dx + dy * dy + dz * dz;

                if (distanceSquared <= maxDistanceSquared) {
                    shouldUpdate = true;
                    break;
                }
            }

            if (shouldUpdate) {
                updateWarpSign(warp);
            }
        });
    }

    const updateWarpSign = (warp) => {
        try {
            const warpDimension = getDimensionByName(warp.dimension);
            if (!warpDimension) return;

            const signLocation = {
                x: warp.x,
                y: warp.y,
                z: warp.z
            };

            // If sign exists, remove it and create a new one
            const existingBlock = warpDimension.getBlock(signLocation);
            const isCorrectSign = existingBlock && (existingBlock.typeId.includes("standing_sign") || existingBlock.typeId.includes("wall_sign") || existingBlock.typeId.includes("hanging_sign"));
            if (isCorrectSign) {
                warpDimension.setBlockType(signLocation, "minecraft:air");
            }

            let signBlock;
            signBlock = warpDimension.getBlock(signLocation);
            if (!signBlock) {
                return false;
            }
            // Get sign metadata
            const signMetadata = WarpSign(warpDimension, warp);
            const blockPermutation = BlockPermutation.resolve(signMetadata.blockId, signMetadata.blockProperties);
            signBlock.setPermutation(blockPermutation);
            const signComponent = signBlock.getComponent("minecraft:sign");
            if (signComponent) {
                signComponent.setText(signMetadata.text, SignSide.Front);
                signComponent.setTextDyeColor(signMetadata.textColor, SignSide.Front);
                if (signMetadata.isDoubleSide) {
                    signComponent.setText(signMetadata.text, SignSide.Back);
                    signComponent.setTextDyeColor(signMetadata.textColor, SignSide.Back);
                }
                signComponent.setWaxed(true);
                return true;
            }
        } catch (error) {
            if (error instanceof LocationInUnloadedChunkError) {
                console.error(`[WARP] Block out of area for ${warp.name}: ${error}`);
                // Chunk is not loaded, skip updating this sign
            }
            console.error(`[WARP] Error updating sign for warp ${warp.name}: ${error}`);
            return false;
        }
    }

    const removeWarpSign = (warp) => {
        try {
            const warpDimension = getDimensionByName(warp.dimension);
            if (!warpDimension) return;

            const signLocation = {
                x: warp.x,
                y: warp.y,
                z: warp.z
            };

            const existingBlock = warpDimension.getBlock(signLocation);
            if (existingBlock && (existingBlock.typeId.includes("standing_sign") || existingBlock.typeId.includes("wall_sign") || existingBlock.typeId.includes("hanging_sign"))) {
                warpDimension.setBlockType(signLocation, "minecraft:air");
            }
        } catch (error) {
            if (error instanceof LocationInUnloadedChunkError) {
                // Chunk is not loaded, skip removing sign
                return;
            }
            console.error(`[WARP] Error removing sign for warp ${warp.name}: ${error}`);
        }
    }

    ///=================================================================================================================
    // === Add Functions ===
    const addWarpItemFormStep1 = (player, {
        warpName = "",
        iconName = "",
        category = "",
        targetLocation,
        warpDimensionId
    }) => {
        // If category and icon are already selected (e.g., after error), skip step 1 and 2
        if (iconName) {
            const selectedIcon = getIconByName(iconName);
            if (selectedIcon) {
                addWarpItemFormStep3(player, warpName, selectedIcon, targetLocation, warpDimensionId);
                return;
            }
        }

        // Step 1/3: Category selection
        const categories = getCategories();
        const categoryForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:add.step1.title"}]})
            .body({rawtext: [{translate: "warps:add.step1.body"}]});

        categories.forEach(cat => {
            categoryForm.button({
                rawtext: [{translate: `warps:category.${cat}`}]
            });
        });

        categoryForm.show(player).then((categoryRes) => {
            if (categoryRes.canceled || categoryRes.selection === undefined || categoryRes.selection >= categories.length) {
                return;
            }

            const selectedCategory = categories[categoryRes.selection];
            addWarpItemFormStep2(player, warpName, selectedCategory, targetLocation, warpDimensionId);
        });
    }

    const addWarpItemFormStep2 = (player, warpName, category, targetLocation, warpDimensionId) => {
        // Step 2/3: Icon selection from selected category
        const categoryIcons = WARP_ICONS.filter(icon => icon && icon.category === category);

        const iconForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:add.step2.title"}]})
            .body({
                rawtext: [{
                    translate: "warps:add.step2.body",
                    with: {rawtext: [{translate: `warps:category.${category}`}]}
                }]
            });

        categoryIcons.forEach((icon) => {
            iconForm.button({
                rawtext: [{translate: icon.translatedName}]
            }, icon.path);
        });

        iconForm.show(player).then((iconRes) => {
            if (iconRes.canceled || iconRes.selection === undefined || iconRes.selection >= categoryIcons.length) {
                return;
            }

            const selectedIcon = categoryIcons[iconRes.selection];
            if (!selectedIcon) {
                return;
            }

            addWarpItemFormStep3(player, warpName, selectedIcon, targetLocation, warpDimensionId);
        });
    }

    const addWarpItemFormStep3 = (player, warpName, icon, targetLocation, warpDimensionId, visibility = WARP_VISIBILITY.PROTECTED) => {
        // Step 3/3: Name, coordinates and visibility
        const currentSignModeIndex = (Math.abs(targetLocation.x - player.location.x) > Math.abs(targetLocation.z - player.location.z));

        new MinecraftUi.ModalFormData()
            .title({rawtext: [{translate: "warps:add.step3.title"}]})
            .label({rawtext: [{translate: "warps:field.category_icon.label"}]})
            .label({
                rawtext: [{
                    translate: "§l%%s§r / §l%%s§r", with: {
                        rawtext: [
                            {translate: icon.translatedCategory},
                            {translate: icon.translatedName},
                        ]
                    }
                }]
            })
            .textField({rawtext: [{translate: "warps:field.name.label"}]}, {rawtext: [{translate: "warps:field.name.placeholder"}]}, {defaultValue: warpName})
            .textField({rawtext: [{translate: "warps:field.x.label"}]}, {rawtext: [{translate: "warps:field.x.placeholder"}]}, {defaultValue: targetLocation.x.toString()})
            .textField({rawtext: [{translate: "warps:field.y.label"}]}, {rawtext: [{translate: "warps:field.y.placeholder"}]}, {defaultValue: targetLocation.y.toString()})
            .textField({rawtext: [{translate: "warps:field.z.label"}]}, {rawtext: [{translate: "warps:field.z.placeholder"}]}, {defaultValue: targetLocation.z.toString()})
            .dropdown(
                {rawtext: [{translate: "warps:field.sign_mode.label"}]},
                Object.values(SIGN_MODE).map(type => ({
                    rawtext: [{translate: `warps:field.sign_mode.value.${type}`}]
                })),
                {defaultValueIndex: currentSignModeIndex >= 0 ? currentSignModeIndex : 0}
            )
            .dropdown(
                {rawtext: [{translate: "warps:field.sign_material.label"}]},
                Object.values(SIGN_MATERIAL).map(type => ({
                    rawtext: [{translate: `warps:field.sign_material.value.${type}`}]
                })),
                {defaultValueIndex: 0}
            )
            .dropdown(
                {rawtext: [{translate: "warps:field.visibility.label"}]},
                [
                    {rawtext: [{translate: "warps:visibility.state.private.label"}]},
                    {rawtext: [{translate: "warps:visibility.state.protected.label"}]},
                    {rawtext: [{translate: "warps:visibility.state.public.label"}]}
                ],
                {
                    defaultValueIndex: getVisibilityIndex(visibility)
                }
            )
            .submitButton({rawtext: [{translate: "warps:add.submit"}]})
            .show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            let index = 2;
            const warpNameIndex = index++;
            const targetLocationXIndex = index++;
            const targetLocationYIndex = index++;
            const targetLocationZIndex = index++;
            const signModeIndex = index++;
            const signMaterialIndex = index++;
            const visibilityIndex = index++;

            if (!res.formValues || !res.formValues[warpNameIndex]
                || !res.formValues[targetLocationXIndex] || !res.formValues[targetLocationYIndex] || !res.formValues[targetLocationZIndex]
                || res.formValues[signModeIndex] === undefined
                || res.formValues[signMaterialIndex] === undefined
                || res.formValues[visibilityIndex] === undefined) {
                player.sendMessage({translate: "warps:error.fill_required"});
                // Show form again with filled data
                const currentVisibility = res.formValues && res.formValues[visibilityIndex] !== undefined
                    ? getVisibilityByIndex(res.formValues[visibilityIndex])
                    : visibility;
                addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId, currentVisibility);
                return;
            }

            warpName = res.formValues[warpNameIndex].replace('"', "'");
            const finalLocation = {
                x: parseFloat(res.formValues[targetLocationXIndex].toString()),
                y: parseFloat(res.formValues[targetLocationYIndex].toString()),
                z: parseFloat(res.formValues[targetLocationZIndex].toString())
            };
            const selectedSignMode = Object.values(SIGN_MODE)[res.formValues[signModeIndex]] || Object.values(SIGN_MODE)[0];
            const selectedSignMaterial = Object.values(SIGN_MATERIAL)[res.formValues[signMaterialIndex]] || Object.values(SIGN_MATERIAL)[0];
            const selectedVisibility = getVisibilityByIndex(res.formValues[visibilityIndex]);
            addWarpItemSave(player, warpName, icon, finalLocation, warpDimensionId, selectedSignMode, selectedSignMaterial, selectedVisibility);
        });
    }

    const addWarpItemSave = (player, warpName, icon, targetLocation, warpDimensionId, signMode = Object.values(SIGN_MODE)[0], signMaterial = Object.values(SIGN_MATERIAL)[0], visibility = WARP_VISIBILITY.PROTECTED) => {
        // Icon validation
        if (!icon || !icon.name) {
            player.sendMessage({translate: "warps:add.invalid_icon"});
            addWarpItemFormStep1(player, {warpName, targetLocation, warpDimensionId});
            return;
        }

        // Name validation
        if (!warpName || warpName.trim().length === 0) {
            player.sendMessage({translate: "warps:error.fill_required"});
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        if (warpName.length > 50) {
            player.sendMessage({translate: "warps:add.name_too_long"});
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        if (isNaN(targetLocation.x) || isNaN(targetLocation.y) || isNaN(targetLocation.z)) {
            player.sendMessage({translate: "warps:add.coords_must_be_number"});
            // Show form again with filled data (step 3/3, skipping category and icon selection)
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        // Coordinate validation (reasonable limits)
        // Y can be from -64 to 320 in Bedrock Edition (from version 1.18+)
        if (Math.abs(targetLocation.x) > 30000000 || targetLocation.y < -64 || targetLocation.y > 320 || Math.abs(targetLocation.z) > 30000000) {
            player.sendMessage({translate: "warps:add.coords_out_of_range"});
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        const warps = loadWarps();

        targetLocation = roundLocation(targetLocation);

        // Check if warp with same name already exists (only if not editing or changing name)
        if (warps.some(w => w.name === warpName)) {
            player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [warpName]
            });
            // Show form again with filled data (step 3/3, skipping category and icon selection)
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        const newWarp = {
            name: warpName,
            x: targetLocation.x,
            y: targetLocation.y,
            z: targetLocation.z,
            dimension: warpDimensionId,
            icon: icon.name,
            owner: player.name,
            visibility: visibility,
            signMode: signMode,
            signMaterial: signMaterial,
        };

        warps.push(newWarp);
        saveWarps(player, SAVE_ACTION.CREATE, warps, newWarp, "warps:add.success", [
            warpName,
            targetLocation.x.toString(), targetLocation.y.toString(), targetLocation.z.toString()
        ]);
    }

    ///=================================================================================================================
    // === WARP EDIT NAME ===
    const editWarpNameForm = (player, warp) => {

        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!warp) {
            player.sendMessage({translate: "warps:error.warp_name_not_found"});
            return;
        }

        const currentSignMaterialIndex = Object.values(SIGN_MATERIAL).indexOf(warp.signMaterial);
        const currentSignModeIndex = Object.values(SIGN_MODE).indexOf(warp.signMode);

        new MinecraftUi.ModalFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.edit_name.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .textField(
                {rawtext: [{translate: "warps:field.name.label"}]},
                {rawtext: [{translate: "warps:field.name.placeholder"}]},
                {defaultValue: warp.name}
            )
            .dropdown(
                {rawtext: [{translate: "warps:field.sign_mode.label"}]},
                Object.values(SIGN_MODE).map(type => ({
                    rawtext: [{translate: `warps:field.sign_mode.value.${type}`}]
                })),
                {defaultValueIndex: currentSignModeIndex >= 0 ? currentSignModeIndex : 0}
            )
            .dropdown(
                {rawtext: [{translate: "warps:field.sign_material.label"}]},
                Object.values(SIGN_MATERIAL).map(type => ({
                    rawtext: [{translate: `warps:field.sign_material.value.${type}`}]
                })),
                {defaultValueIndex: currentSignMaterialIndex >= 0 ? currentSignMaterialIndex : 0}
            )
            .submitButton({rawtext: [{translate: "warps:add.submit"}]})
            .show(player).then((res) => {
            if (res.canceled) {
                showWarpDetailsMenu(player, warp);
                return;
            }

            if (!res.formValues || res.formValues.length < 3) {
                player.sendMessage({translate: "warps:error.fill_required"});
                editWarpNameForm(player, warp);
                return;
            }

            let index = 0;
            const warpNameIndex = index++;
            const signModeIndex = index++;
            const signMaterialIndex = index++;

            const newWarpName = res.formValues[warpNameIndex]?.toString().trim();
            const newSignModeIndex = res.formValues[signModeIndex];
            const newSignMode = Object.values(SIGN_MODE)[newSignModeIndex] || Object.values(SIGN_MODE)[0];
            const newSignMaterialIndex = res.formValues[signMaterialIndex];
            const newSignMaterial = Object.values(SIGN_MATERIAL)[newSignMaterialIndex] || Object.values(SIGN_MATERIAL)[0];

            editWarpNameSave(player, warp, newWarpName, newSignMode, newSignMaterial);
        });
    }

    const editWarpNameSave = (player, warp, newWarpName, newSignMode, newSignMaterial) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!newWarpName || newWarpName.length === 0) {
            player.sendMessage({translate: "warps:error.fill_required"});
            editWarpNameForm(player, warp);
            return;
        }

        if (newWarpName.length > 50) {
            player.sendMessage({translate: "warps:add.name_too_long"});
            editWarpNameForm(player, warp);
            return;
        }

        const warps = loadWarps();
        const warpIndex = warps.findIndex(w => w.name === warp.name);

        if (warpIndex === -1) {
            player.sendMessage({translate: "warps:error.warp_name_not_found"});
            return;
        }

        // Check if new name is not already taken (if it changed)
        if (newWarpName !== warp.name && warps.some(w => w.name === newWarpName)) {
            player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [newWarpName]
            });
            editWarpNameForm(player, warp);
            return;
        }

        const oldName = warp.name;

        // Remove old sign if name or mode or material changed
        if (oldName !== newWarpName || warps[warpIndex].signMode !== newSignMode || warps[warpIndex].signMaterial !== newSignMaterial) {
            removeWarpSign(warps[warpIndex]);
            warps[warpIndex].name = newWarpName;
            warps[warpIndex].signMode = newSignMode;
            warps[warpIndex].signMaterial = newSignMaterial;
            warps[warpIndex].facing = null;
            saveWarps(player, SAVE_ACTION.UPDATE, warps, warps[warpIndex], "warps:warp_details.edit_name.success", [
                oldName,
                newWarpName,
            ]);
        }
    }

    ///=================================================================================================================
    // === WARP EDIT COORDINATES ===

    const editWarpCoordinatesForm = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!warp) {
            player.sendMessage({translate: "warps:error.warp_not_found"});
            return;
        }

        const currentX = warp.x;
        const currentY = warp.y;
        const currentZ = warp.z;

        const form = new MinecraftUi.ModalFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.edit_coordinates.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .slider(
                {rawtext: [{translate: "warps:field.x.label"}]},
                currentX - 5,
                currentX + 5,
                {defaultValue: currentX}
            )
            .slider(
                {rawtext: [{translate: "warps:field.y.label"}]},
                currentY - 5,
                currentY + 5,
                {defaultValue: currentY}
            )
            .slider(
                {rawtext: [{translate: "warps:field.z.label"}]},
                currentZ - 5,
                currentZ + 5,
                {defaultValue: currentZ}
            );

        form.show(player).then((res) => {
            if (res.canceled) {
                showWarpDetailsMenu(player, warp);
                return;
            }

            if (!res.formValues || res.formValues.length < 3) {
                player.sendMessage({translate: "warps:error.fill_required"});
                editWarpCoordinatesForm(player, warp);
                return;
            }

            const newX = Math.round(parseFloat(res.formValues[0].toString()));
            const newY = Math.round(parseFloat(res.formValues[1].toString()));
            const newZ = Math.round(parseFloat(res.formValues[2].toString()));

            editWarpCoordinatesSave(player, warp, newX, newY, newZ);
        });
    }

    const editWarpCoordinatesSave = (player, warp, newX, newY, newZ) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (newY < -64 || newY > 320) {
            player.sendMessage({translate: "warps:add.coords_out_of_range"});
            editWarpCoordinatesForm(player, warp);
            return;
        }

        const warps = loadWarps();
        const warpIndex = warps.findIndex(w => w.name === warp.name);

        if (warpIndex === -1) {
            player.sendMessage({translate: "warps:error.warp_not_found"});
            return;
        }

        const oldX = warps[warpIndex].x;
        const oldY = warps[warpIndex].y;
        const oldZ = warps[warpIndex].z;

        // Remove old sign if location changed (before updating coordinates)
        if (oldX !== newX || oldY !== newY || oldZ !== newZ) {
            const oldWarp = {
                ...warps[warpIndex],
                x: oldX,
                y: oldY,
                z: oldZ
            };
            removeWarpSign(oldWarp);

            warps[warpIndex].x = newX;
            warps[warpIndex].y = newY;
            warps[warpIndex].z = newZ;

            saveWarps(player, SAVE_ACTION.UPDATE, warps, warps[warpIndex], "warps:warp_details.edit_coordinates.success", [
                {text: warp.name},
                {text: `${oldX}, ${oldY}, ${oldZ}`},
                {text: `${newX}, ${newY}, ${newZ}`}
            ]);
        }

    }

    ///=================================================================================================================
    // === WARP EDIT VISIBILITY ===

    const editWarpVisibilityForm = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!warp) {
            player.sendMessage({translate: "warps:error.warp_not_found"});
            return;
        }

        // Cannot change public warps
        if (warp.visibility === WARP_VISIBILITY.PUBLIC) {
            player.sendMessage({translate: "warps:visibility.cannot_change_public"});
            showWarpDetailsMenu(player, warp);
            return;
        }

        system.run(() => {
            const availableOptions = [];

            if (warp.visibility === WARP_VISIBILITY.PRIVATE) {
                // Private can become protected or public
                availableOptions.push({rawtext: [{translate: "warps:visibility.state.protected.label"}]});
                availableOptions.push({rawtext: [{translate: "warps:visibility.state.public.label"}]});
            } else if (warp.visibility === WARP_VISIBILITY.PROTECTED) {
                // Protected can become private or public
                availableOptions.push({rawtext: [{translate: "warps:visibility.state.private.label"}]});
                availableOptions.push({rawtext: [{translate: "warps:visibility.state.public.label"}]});
            }

            new MinecraftUi.ActionFormData()
                .title({
                    rawtext: [{
                        translate: "warps:warp_details.change_visibility.title",
                        with: {rawtext: [{text: warp.name}]}
                    }]
                })
                .body({
                    rawtext: [{
                        translate: "warps:warp_details.change_visibility.body",
                        with: {
                            rawtext: [
                                {text: warp.name},
                                {translate: `warps:visibility.state.${warp.visibility}.label`}
                            ]
                        }
                    }]
                })
                .button(availableOptions[0])
                .button(availableOptions[1])
                .show(player).then((res) => {
                if (res.canceled) {
                    showWarpDetailsMenu(player, warp);
                    return;
                }

                let newVisibility;
                if (warp.visibility === WARP_VISIBILITY.PRIVATE) {
                    newVisibility = res.selection === 0 ? WARP_VISIBILITY.PROTECTED : WARP_VISIBILITY.PUBLIC;
                } else {
                    newVisibility = res.selection === 0 ? WARP_VISIBILITY.PRIVATE : WARP_VISIBILITY.PUBLIC;
                }

                // Warning when switching to public
                if (newVisibility === WARP_VISIBILITY.PUBLIC) {
                    new MinecraftUi.MessageFormData()
                        .title({
                            rawtext: [{
                                translate: "warps:warp_details.change_visibility.public_warning.title"
                            }]
                        })
                        .body({
                            rawtext: [{
                                translate: "warps:warp_details.change_visibility.public_warning.body"
                            }]
                        })
                        .button1({rawtext: [{translate: "warps:warp_details.change_visibility.public_warning.confirm"}]})
                        .button2({rawtext: [{translate: "warps:warp_details.change_visibility.public_warning.cancel"}]})
                        .show(player).then((confirmRes) => {
                        if (confirmRes.selection === 0) {
                            editWarpVisibilitySave(player, warp, newVisibility);
                        } else {
                            editWarpVisibilityForm(player, warp);
                        }
                    });
                } else {
                    editWarpVisibilitySave(player, warp, newVisibility);
                }
            });
        });
    }

    const editWarpVisibilitySave = (player, warp, newVisibility) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        const warps = loadWarps();
        const warpIndex = warps.findIndex(w => w.name === warp.name);

        if (warpIndex === -1) {
            player.sendMessage({translate: "warps:error.warp_name_not_found"});
            return;
        }

        warps[warpIndex].visibility = newVisibility;
        saveWarps(player, SAVE_ACTION.UPDATE, warps, warps[warpIndex], "warps:warp_details.change_visibility.success", [
            warp.name,
            {translate: `warps:visibility.state.${warp.visibility}.label`},
            {translate: `warps:visibility.state.${newVisibility}.label`}
        ]);
    }

    ///=================================================================================================================
    // === WARP EDIT ICON ===

    const editWarpIconFormStep1 = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!warp) {
            player.sendMessage({translate: "warps:error.warp_not_found"});
            return;
        }

        // Step 1: Category selection
        const categories = getCategories();
        const categoryForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.edit_icon.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body({rawtext: [{translate: "warps:warp_details.edit_icon.step1.body"}]});

        categories.forEach(cat => {
            categoryForm.button({
                rawtext: [{translate: `warps:category.${cat}`}]
            });
        });

        categoryForm.show(player).then((categoryRes) => {
            if (categoryRes.canceled || categoryRes.selection === undefined || categoryRes.selection >= categories.length) {
                showWarpDetailsMenu(player, warp);
                return;
            }

            const selectedCategory = categories[categoryRes.selection];
            editWarpIconFormStep2(player, warp, selectedCategory);
        });
    }

    const editWarpIconFormStep2 = (player, warp, category) => {
        // Step 2: Icon selection from selected category
        const categoryIcons = WARP_ICONS.filter(icon => icon && icon.category === category);

        const iconForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.edit_icon.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body({
                rawtext: [{
                    translate: "warps:warp_details.edit_icon.step2.body",
                    with: {rawtext: [{translate: `warps:category.${category}`}]}
                }]
            });

        categoryIcons.forEach((icon) => {
            iconForm.button({
                rawtext: [{translate: icon.translatedName}]
            }, icon.path);
        });

        iconForm.show(player).then((iconRes) => {
            if (iconRes.canceled || iconRes.selection === undefined || iconRes.selection >= categoryIcons.length) {
                showWarpDetailsMenu(player, warp);
                return;
            }

            const selectedIcon = categoryIcons[iconRes.selection];
            if (!selectedIcon) {
                return;
            }

            editWarpIconSave(player, warp, selectedIcon);
        });
    }

    const editWarpIconSave = (player, warp, selectedIcon) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        const warps = loadWarps();
        const warpIndex = warps.findIndex(w => w.name === warp.name);

        if (warpIndex === -1) {
            player.sendMessage({translate: "warps:error.warp_name_not_found"});
            return;
        }

        if (warp.icon !== selectedIcon.name) {
            removeWarpSign(warp);

            warps[warpIndex].icon = selectedIcon.name;

            saveWarps(player, SAVE_ACTION.UPDATE, warps, warps[warpIndex], "warps:warp_details.edit_icon.success", [
                {text: warp.name},
                {translate: selectedIcon.translatedName}
            ]);
        }
    }

    ///=================================================================================================================
    // === REMOVE WARP ===

    const removeWarpItemForm = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!warp) {
            player.sendMessage({translate: "warps:error.warp_not_found"});
            return;
        }

        new MinecraftUi.MessageFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.remove_confirm.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body({rawtext: [{translate: "warps:warp_details.remove_confirm.body"}]})
            .button1({rawtext: [{translate: "warps:warp_details.remove_confirm.yes"}]})
            .button2({rawtext: [{translate: "warps:warp_details.remove_confirm.no"}]})
            .show(player).then((res) => {
            if (res.selection === 0) {
                // Check permissions before deletion
                if (!canPlayerEditWarp(player, warp)) {
                    player.sendMessage({translate: "warps:error.no_permission"});
                    return;
                }

                const allWarps = loadWarps();
                const updatedWarps = allWarps.filter(w =>
                    !(w.name === warp.name &&
                        w.x === warp.x &&
                        w.y === warp.y &&
                        w.z === warp.z &&
                        w.dimension === warp.dimension)
                );
                saveWarps(player, SAVE_ACTION.DELETE, updatedWarps, warp, "warps:warp_details.remove.success", [
                    warp.name,
                ]);
            } else {
                showWarpDetailsMenu(player, warp);
            }
        })
    }

    ///=================================================================================================================
    // === Main Menu ===
    const showMainMenu = (player) => {
        const menuForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:main_menu.title"}]})
            .body("");

        const BUTTON_TELEPORT = 0;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.teleport"}]
        });
        const BUTTON_MANAGEMENT = 1;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.manage"}]
        });
        const BUTTON_ADD = 2;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.add"}]
        });

        menuForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            switch (res.selection) {
                case BUTTON_TELEPORT: {
                    const teleportWarps = filterWarpsByVisibility(getValidWarps(), player);
                    if (teleportWarps.length === 0) {
                        player.sendMessage({translate: "warps:menu.no_warps"});
                    } else {
                        showWarpsListMenuWithOptions(player, teleportWarps, SORT_BY.DISTANCE, WARP_MENU.TELEPORT, null, null, null, null);
                    }
                    break;
                }
                case BUTTON_MANAGEMENT: {
                    const manageWarps = filterWarpsByVisibility(getValidWarps(), player);
                    if (manageWarps.length === 0) {
                        player.sendMessage({translate: "warps:menu.no_warps"});
                    } else {
                        showWarpsListMenuWithOptions(player, manageWarps, SORT_BY.ALPHABETICAL, WARP_MENU.MANAGEMENT, null, null, null, null);
                    }
                    break;
                }
                case BUTTON_ADD:
                    addWarpItemFormStep1(player, {
                        targetLocation: roundLocation(player.location),
                        warpDimensionId: getPlayerDimension(player)
                    });
                    break;
            }
        });
    }

    ///=================================================================================================================
    const teleportCommand = (origin, warpName = "") => {
        system.run(() => {
            const player = getPlayer(origin)
            if (!player) return;
            if (warpName !== "") {
                teleportToWarpByName(player, warpName)
            } else {
                const warps = filterWarpsByVisibility(getValidWarps(), player);
                if (warps.length > 0) {
                    showWarpsListMenuWithOptions(player, warps, SORT_BY.DISTANCE, WARP_MENU.TELEPORT, null, null, null, null);
                }
            }
        });
        return {
            status: CustomCommandStatus.Success,
        };
    };
    const listCommand = (origin) => {
        system.run(() => {
            const player = getPlayer(origin)
            player.sendMessage({translate: "warps:menu.filter_all"});
            getValidWarps().forEach(warp => player.sendMessage(
                getWarpDetails(warp, player, TRANSLATION_PATTERN.LIST_ALL)
            ))
        });
        return {
            status: CustomCommandStatus.Success,
        };
    }
    const addCommand = (origin, warpName, iconName, location, signMode, signMaterial) => {
        system.run(() => {
            const player = getPlayer(origin)
            if (!player) return;

            const targetLocation = roundLocation(location || player.location);
            const warpDimensionId = getPlayerDimension(player);
            if (warpName && iconName && targetLocation && signMode && signMaterial) {
                const icon = getIconByName(iconName);
                addWarpItemSave(player, warpName, icon, targetLocation, warpDimensionId, signMode, signMaterial);
            } else {
                addWarpItemFormStep1(player, {
                    warpName: warpName,
                    iconName: iconName,
                    targetLocation: targetLocation,
                    warpDimensionId: warpDimensionId
                });
            }
        })
    }
    const renameCommand = (origin, oldWarpName = "", newWarpName = "") => {
        system.run(() => {
            const player = getPlayer(origin)
            if (!player) return;
            if (oldWarpName !== "") {
                const warp = getWarpByName(oldWarpName);
                if (!warp) {
                    return player.sendMessage({
                        translate: "warps:error.warp_name_not_found",
                        with: [oldWarpName]
                    });
                }
                editWarpNameSave(player, warp, newWarpName, warp.signMode, warp.signMaterial);
            } else {
                const warps = filterWarpsByVisibility(getValidWarps(), player);
                if (warps.length > 0) {
                    showWarpsListMenuWithOptions(player, warps, SORT_BY.ALPHABETICAL, WARP_MENU.MANAGEMENT, null, null, null, null);
                }
            }
        })
    }
    const updateSignCommand = (origin, warpName, signMode, signMaterial) => {
        system.run(() => {
            const player = getPlayer(origin)
            if (!player) return;
            if (warpName !== "" && signMode !== "" && signMaterial !== "") {
                const warp = getWarpByName(warpName);
                if (!warp) {
                    return player.sendMessage({
                        translate: "warps:error.warp_name_not_found",
                        with: [warpName]
                    });
                }
                editWarpNameSave(player, warp, warpName, signMode, signMaterial);
            } else {
                const warps = filterWarpsByVisibility(getValidWarps(), player);
                if (warps.length > 0) {
                    showWarpsListMenuWithOptions(player, warps, SORT_BY.ALPHABETICAL, WARP_MENU.MANAGEMENT, null, null, null, null);
                }
            }
        })
    }

    const registerCommandWithAliases = (event, names, customCommand, callback) => {
        for (const name of names) {
            customCommand.name = `warps:${name}`;
            event.customCommandRegistry.registerCommand(customCommand, callback);
        }
    }

    const updateIconCommand = (origin, warpName, iconName) => {
        system.run(() => {
            const player = getPlayer(origin)
            if (!player) return;
            if (warpName !== "" && iconName !== "") {
                const warp = getWarpByName(warpName);
                if (!warp) {
                    return player.sendMessage({
                        translate: "warps:error.warp_name_not_found",
                        with: [warpName]
                    });
                }
                const icon = getIconByName(iconName);
                if (!icon) {
                    player.sendMessage({translate: "warps:error.icon_name_not_found"});
                    return;
                }
                editWarpIconSave(player, warp, icon);
            } else {
                const warps = filterWarpsByVisibility(getValidWarps(), player);
                if (warps.length > 0) {
                    showWarpsListMenuWithOptions(player, warps, SORT_BY.ALPHABETICAL, WARP_MENU.MANAGEMENT, null, null, null, null);
                }
            }
        })
    }
    const removeCommand = (origin, warpName = "") => {
        system.run(() => {
            const player = getPlayer(origin)
            if (!player) return;
            if (warpName !== "") {
                const warp = getWarpByName(warpName);
                if (!warp) {
                    return player.sendMessage({
                        translate: "warps:error.warp_name_not_found",
                        with: [warpName]
                    });
                }
                removeWarpItemForm(player, warp);
            } else {
                const warps = filterWarpsByVisibility(getValidWarps(), player);
                if (warps.length > 0) {
                    showWarpsListMenuWithOptions(player, warps, SORT_BY.ALPHABETICAL, WARP_MENU.MANAGEMENT, null, null, null, null);
                }
            }
        })
    }
    const regenerateCommand = (origin) => {
        system.run(() => {
            const player = getPlayer(origin);
            if (!player) return;

            console.info("[WARP] Regenerating all warp signs...");
            const warps = getValidWarps();
            let updated = 0;

            warps.forEach(warp => {
                try {
                    if (updateWarpSign(warp)) {
                        updated++;
                    }
                } catch (error) {
                    console.error(`[WARP] Error regenerating sign for warp ${warp.name}: ${error}`);
                }
            });

            console.info(`[WARP] Regenerated ${updated} warp signs`);
            player.sendMessage({
                translate: "warps:regen_signs.success",
                with: [updated.toString()]
            });
        });
    }
    // === Initialization ===
    const init = () => {
        ///=================================================================================================================
        // === Command Registration ===
        Minecraft.system.beforeEvents.startup.subscribe((event) => {
            console.info("[WARP] Loaded Script")

            event.customCommandRegistry.registerEnum("warps:icon", WARP_ICONS.filter(icon => icon && icon.name).map(icon => icon.name));
            event.customCommandRegistry.registerEnum("warps:sign_mode", Object.values(SIGN_MODE));
            event.customCommandRegistry.registerEnum("warps:sign_material", Object.values(SIGN_MATERIAL));

            registerCommandWithAliases(event, ["warp_tp", "wtp"], {
                    description: "Warp to a specific location (public Warps)",
                    permissionLevel: Minecraft.CommandPermissionLevel.Any,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name"
                    }],
                },
                teleportCommand
            );

            registerCommandWithAliases(event, ["warps_list", "wl"], {
                    description: "List all Warps",
                    permissionLevel: Minecraft.CommandPermissionLevel.Any,
                },
                listCommand
            );

            registerCommandWithAliases(event, ["warp_add", "wa"], {
                    description: "Add a new public Warp",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:icon",
                    }, {
                        type: CustomCommandParamType.Location,
                        name: "warps:location",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:sign_mode",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:sign_material",
                    }],
                },
                addCommand
            );

            registerCommandWithAliases(event, ["warp_rename"], {
                    description: "Rename a public Warp",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }, {
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }],
                },
                renameCommand
            );

            registerCommandWithAliases(event, ["warp_sign_change", "warp_sign"], {
                    description: "Change sign for a public Warp",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:sign_mode",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:sign_material",
                    }],
                },
                updateSignCommand
            );

            registerCommandWithAliases(event, ["warp_icon_change", "warp_icon"], {
                    description: "Change icon for a public Warp",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:icon",
                    }],
                },
                updateIconCommand
            );

            registerCommandWithAliases(event, ["warp_remove"], {
                    description: "Remove a public Warp",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }],
                },
                removeCommand
            );

            registerCommandWithAliases(event, ["warps_signs_regenerate", "warps_reload"], {
                    description: "Regenerate all warp signs",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                },
                regenerateCommand
            );

            ///=================================================================================================================
            // === Item Component Registration ===
            event.itemComponentRegistry.registerCustomComponent(ITEM_COMPONENT_ID, {
                // Shift + right click on block = adding warp
                onUseOn: (event) => {
                    system.run(() => {
                        const player = event.source && event.source.typeId === "minecraft:player" ? event.source : null;
                        const item = event.itemStack;
                        const block = event.block;
                        if (!player || !item || !block || !player.isSneaking || block.typeId === "air") return;

                        const blockLoc = block.location;
                        let targetLocation = roundLocation({x: blockLoc.x, y: blockLoc.y, z: blockLoc.z});

                        switch (event.blockFace) {
                            case Minecraft.Direction.Up:
                                targetLocation.y += 1;
                                break;
                            case Minecraft.Direction.Down:
                                targetLocation.y -= 1;
                                break;
                            case Minecraft.Direction.North:
                                targetLocation.z -= 1;
                                break;
                            case Minecraft.Direction.South:
                                targetLocation.z += 1;
                                break;
                            case Minecraft.Direction.East:
                                targetLocation.x += 1;
                                break;
                            case Minecraft.Direction.West:
                                targetLocation.x -= 1;
                                break;
                        }

                        addWarpItemFormStep1(player, {
                            targetLocation: targetLocation,
                            warpDimensionId: getPlayerDimension(player)
                        });
                    });
                },
                // Right click = adding warp
                onUse: (event) => {
                    system.run(() => {
                        const player = event.source && event.source.typeId === "minecraft:player" ? event.source : null;
                        if (!player || player.isSneaking) return;
                        showMainMenu(player);
                    });
                }
            });

        });
    }

    Minecraft.world.afterEvents.worldLoad.subscribe(() => {
        system.runTimeout(() => {
            loadWarps();
        }, 60);
    });

    Minecraft.world.afterEvents.playerInteractWithBlock.subscribe((event) => {
        system.run(() => {
            const player = event.player;
            const block = event.block;

            if (!player || !block) return;

            // Check if it's a standing_sign
            if (!block.typeId.includes("standing_sign") && !block.typeId.includes("wall_sign") && !block.typeId.includes("hanging_sign")) return;

            // Get block location
            const blockLoc = block.location;
            const dimensionId = getPlayerDimension(player);

            // Find warp based on location
            const warp = getWarpByLocation(
                Math.round(blockLoc.x),
                Math.round(blockLoc.y),
                Math.round(blockLoc.z),
                dimensionId
            );

            if (warp) {
                showWarpDetailsMenu(player, warp);
            }
        });
    });

    system.runTimeout(() => {
        updateWarpSigns();
        system.runInterval(() => {
            updateWarpSigns();
        }, 600);
    }, 20);

    return {
        init: init
    }
}
export const WarpsModule = {
    init() {
        const module = Warps();
        module.init();
    }
}
