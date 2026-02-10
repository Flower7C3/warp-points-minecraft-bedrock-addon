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
    const COMMAND_WARPS_TP = "warps:warp_tp";
    const COMMAND_WARPS_LIST = "warps:warps_list";
    const COMMAND_WARPS_ADD = "warps:warp_add";
    const COMMAND_WARP_RENAME = "warps:warp_rename";
    const COMMAND_WARP_SIGN_CHANGE = "warps:warp_sign_change";
    const COMMAND_WARP_ICON_CHANGE = "warps:warp_icon_change";
    const COMMAND_WARP_REMOVE = "warps:warp_remove";
    const COMMAND_WARPS_REGEN_SIGNS = "warps:warps_signs_regenerate";
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
            player.dimension.playSound(soundId, player.location);
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

    const getWarpDimension = (dimensionId) => Minecraft.world.getDimension(`minecraft:${dimensionId}`);

    const getWarpDetails = (warp, player, translationKey, simplifiedData) => {
        const visibility = (warp.visibility === null || warp.visibility === "" || warp.visibility === undefined)
            ? WARP_VISIBILITY.PUBLIC
            : warp.visibility;

        const getWarpDetailsLocationTexts = (warpArg) => {
            const coords = `${warpArg.x ?? "?"}, ${warpArg.y ?? "?"}, ${warpArg.z ?? "?"}`;
            const dim = (warpArg.dimension != null && String(warpArg.dimension)) ? String(warpArg.dimension) : "overworld";
            return { translate: `${translationKey}.location`, with: { rawtext: [{ text: coords }, { translate: `warps:dimension.${dim}` }] } };
        };
        const DIRECTION_NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const DIRECTION_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
        const getPlayerToWarpDistanceTexts = (playerArg, warpArg) => {
            if (!playerArg) return { text: "" };
            if (warpArg.dimension !== getPlayerDimension(playerArg)) return { text: "" };
            const playerLocation = playerArg.location;
            const distance = calculateDistance(playerLocation.x, playerLocation.y, playerLocation.z, warpArg.x, warpArg.y, warpArg.z);
            const suffix = (distance === 1) ? "1" : ((1 < distance && distance < 5) ? "2" : "5");
            const dx = warpArg.x - playerLocation.x;
            const dz = warpArg.z - playerLocation.z;
            let angleToWarp = (Math.atan2(dx, -dz) * 180 / Math.PI);
            if (angleToWarp < 0) angleToWarp += 360;
            const directionText = DIRECTION_NAMES[Math.round(angleToWarp / 45) % 8];
            const rotation = playerArg.getRotation();
            const playerYaw = (typeof rotation.y === "number") ? rotation.y : 0;
            const playerFacingDeg = (180 + playerYaw + 360) % 360;
            const relativeDeg = (angleToWarp - playerFacingDeg + 360) % 360;
            const directionSign = DIRECTION_ARROWS[Math.round(relativeDeg / 45) % 8];
            return {
                translate: `${translationKey}.distance`, with: {
                    rawtext: [
                        {
                            translate: `warps:distance.value_km`,
                            with: {rawtext: [{text: (distance / 1000).toFixed(2).toString()}]}
                        },
                        {
                            translate: `warps:distance.value_m`,
                            with: {rawtext: [{text: Math.round(distance).toString()}]}
                        },
                        {
                            translate: `warps:distance.value_${suffix}`,
                            with: {rawtext: [{text: Math.round(distance).toString()}]}
                        },
                        (dx === 0 && dz === 0) ? {text: "·"} : {translate: `warps:direction.value_${directionText}`},
                        {text: (dx === 0 && dz === 0) ? "·" : directionSign},
                    ]
                }
            };
        };
        const getWarpIconTexts = (warpArg) => {
            const iconKey = (warpArg && typeof warpArg.icon === "string") ? warpArg.icon : null;
            const rawtext = !iconKey
                ? [{ text: "?" }, { text: "?" }]
                : (() => {
                    const icon = getIconByName(iconKey);
                    if (!icon) {
                        return [{ text: "?" }, { text: iconKey }];
                    }
                    return [
                        (icon.translatedCategory && typeof icon.translatedCategory === "string")
                            ? { translate: icon.translatedCategory } : { text: "?" },
                        (icon.translatedName && typeof icon.translatedName === "string")
                            ? { translate: icon.translatedName } : { text: iconKey }
                    ];
                })();
            return { translate: `${translationKey}.category`, with: { rawtext } };
        };
        const getWarpSignTexts = (warpArg) => ({
            translate: `${translationKey}.sign`,
            with: { rawtext: [
                { translate: `warps:field.sign_mode.value.${getWarpSignMode(warpArg)}` },
                { translate: `warps:field.sign_material.value.${getWarpSignMaterial(warpArg)}` }
            ]}
        });

        let rawText;
        if (simplifiedData) {
            rawText = [
                { text: (warp.name != null ? String(warp.name) : "?") },
                getWarpDetailsLocationTexts(warp),
                { translate: `warps:visibility.state.${visibility}.label` },
                visibility ? { translate: `warps:visibility.state.${visibility}.symbol` } : { text: "" },
                getWarpIconTexts(warp),
            ];
        } else {
            rawText = [
                { text: (warp.name != null ? String(warp.name) : "?") },
                getWarpDetailsLocationTexts(warp),
                getPlayerToWarpDistanceTexts(player, warp),
                { text: String((warp.owner === null || warp.owner === "" || warp.owner === undefined) ? "?" : warp.owner) },
                { translate: `warps:visibility.state.${visibility}.label` },
                visibility ? { translate: `warps:visibility.state.${visibility}.symbol` } : { text: "" },
                getWarpIconTexts(warp),
                getWarpSignTexts(warp),
            ];
        }
        return {
            rawtext: [{
                translate: translationKey,
                with: {
                    rawtext: rawText
                }
            }]
        }
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
    // === Teleport Functions ===

    const teleportToWarpByName = (player, warpName) => {
        if (!player || !warpName) {
            return;
        }

        const warps = filterWarpsByVisibility(getValidWarps(), player);
        const warp = warps.find(w => w.name.toLowerCase() === warpName.toLowerCase());

        if (!warp) {
            return player.sendMessage({translate: "warps:error.warp_name_not_found", with: [warpName]});
        }

        teleportToWarp(player, warp);
    }

    const teleportToWarp = (player, warp) => {
        try {
            const dimension = getWarpDimension(warp.dimension);
            dimension.runCommand(`tp "${player.name}" ${warp.x} ${warp.y} ${warp.z}`);
            player.dimension.playSound("mob.shulker.teleport", {x: warp.x, y: warp.y, z: warp.z});
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

    const showCategoriesListMenu = (player, mode = WARP_MENU.TELEPORT) => {
        const allWarps = getValidWarps();
        const warps = filterWarpsByVisibility(allWarps, player);

        if (warps.length === 0) {
            return player.sendMessage({translate: "warps:menu.no_warps"});
        }

        const filterFormTitle = mode === WARP_MENU.TELEPORT
            ? {rawtext: [{translate: "warps:teleport_menu.title"}]}
            : {rawtext: [{translate: "warps:manage_menu.title"}]};

        const filterForm = new MinecraftUi.ActionFormData()
            .title(filterFormTitle)
            .body("");

        // Option: All warps
        filterForm.button({
            rawtext: [{translate: "warps:menu.filter_all"}]
        });

        filterForm.label({rawtext: [{translate: "warps:menu.filter.or_select_category"}]});

        // Filter categories — show only those that have warps
        const categoriesWithWarps = getCategoriesWithWarps(warps);

        // Options for each category with warps
        categoriesWithWarps.forEach(category => {
            const categoryIcon = WARP_ICONS.find(icon => icon && icon.category === category);
            filterForm.button({
                rawtext: [{
                    translate: "warps:menu.filter_category",
                    with: {
                        rawtext: [{translate: `warps:category.${category}`}]
                    }
                }]
            }, categoryIcon ? categoryIcon.path : "");
        });

        filterForm.show(player).then((filterRes) => {
            if (filterRes.canceled) {
                return;
            }

            let filteredWarps = warps;
            let selectedCategory = null;

            if (filterRes.selection === 0) {
                // All warps
                filteredWarps = warps;
            } else {
                // Selected category
                const categoryIndex = filterRes.selection - 1;
                if (categoryIndex >= 0 && categoryIndex < categoriesWithWarps.length) {
                    selectedCategory = categoriesWithWarps[categoryIndex];
                    filteredWarps = filterWarpsByCategory(warps, selectedCategory);
                }
            }

            // Filter again by visibility (in case category contained invisible warps)
            filteredWarps = filterWarpsByVisibility(filteredWarps, player);

            if (filteredWarps.length === 0) {
                return player.sendMessage({translate: "warps:menu.no_warps_in_category"});
            }

            // Default sorting: distance for teleport, alphabetical for management
            const defaultSortBy = mode === WARP_MENU.TELEPORT ? SORT_BY.DISTANCE : SORT_BY.ALPHABETICAL;
            showWarpsListMenuWithOptions(player, filteredWarps, defaultSortBy, mode, selectedCategory);
        });
    }

    const showSubcategoriesMenu = (player, warps, sortBy, mode = WARP_MENU.TELEPORT, selectedCategory, selectedIcon = null) => {
        const iconsWithWarps = getIconsWithWarps(warps);
        if (iconsWithWarps.length === 0) {
            showWarpsListMenuWithOptions(player, warps, sortBy, mode, selectedCategory, selectedIcon, null);
            return;
        }

        const subForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: (mode === WARP_MENU.TELEPORT)
                        ? "warps:teleport_menu.title"
                        : "warps:manage_menu.title"
                }]
            })
            .body("");

        const BUTTON_ALL_IN_CATEGORY = 0;
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
            subForm.body({
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
                return;
            }
            if (selectedCategory && subRes.selection === BUTTON_ALL_IN_CATEGORY) {
                showWarpsListMenuWithOptions(player, warps, sortBy, mode, selectedCategory, null, null);
                return;
            }
            const iconIndex = selectedCategory ? subRes.selection - 1 : subRes.selection;
            if (iconIndex >= 0 && iconIndex < iconsWithWarps.length) {
                const chosenIcon = iconsWithWarps[iconIndex];
                const filteredWarps = filterWarpsByIcon(warps, chosenIcon.name);
                showWarpsListMenuWithOptions(player, filteredWarps, sortBy, mode, selectedCategory, chosenIcon, warps);
            }
        });
    }

    const showWarpsListMenuWithOptions = (player, warps, sortBy, mode = WARP_MENU.TELEPORT, selectedCategory = null, selectedIcon = null, categoryWarps = null) => {
        const actionForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: (mode === WARP_MENU.TELEPORT)
                        ? "warps:teleport_menu.title"
                        : "warps:manage_menu.title"
                }]
            })
            .body("");


        const BUTTON_CHANGE_SORT = 0;
        const BUTTON_SHOW_SUBCATEGORIES = 1;
        actionForm
            .button({
                rawtext: [{
                    translate: sortBy === SORT_BY.DISTANCE
                        ? "warps:menu.sort_change_to_alphabetical"
                        : "warps:menu.sort_change_to_distance"
                }]
            })
            .button({
                rawtext: [{translate: "warps:menu.show_subcategories"}]
            });

        const sortLabelTextKey = sortBy === SORT_BY.DISTANCE
            ? "warps:menu.sorting_by_distance"
            : "warps:menu.sorting_by_alphabetical";
        if (selectedIcon) {
            const categoryKey = selectedIcon.category ? `warps:category.${selectedIcon.category}` : null;
            actionForm.label({
                rawtext: [{
                    translate: `${sortLabelTextKey}_cat_icon`,
                    with: {
                        rawtext: [
                            categoryKey ? {translate: categoryKey} : {text: ""},
                            {translate: selectedIcon.translatedName}
                        ]
                    }
                }]
            });
        } else {
            actionForm
                .label(selectedCategory
                    ? {
                        rawtext: [{
                            translate: `${sortLabelTextKey}_cat`,
                            with: {
                                rawtext: [{translate: `warps:category.${selectedCategory}`}]
                            }
                        }]
                    }
                    : {rawtext: [{translate: `${sortLabelTextKey}_all`}]}
                );
        }

        // Filter warps by visibility
        const visibleWarps = filterWarpsByVisibility(warps, player);
        const sortedWarps = sortWarps(visibleWarps, sortBy, player);

        sortedWarps.forEach(warp => {
            try {
                const buttonTranslationKey = sortBy === SORT_BY.DISTANCE
                    ? "warps:button_format.long"
                    : "warps:button_format.short";

                const icon = getIconByName(warp.icon);
                actionForm.button(
                    getWarpDetails(warp, player, buttonTranslationKey),
                    icon && icon.path ? icon.path : ""
                );
            } catch (error) {
                console.error(`[WARP] Error creating button for warp ${warp.name}:`, error);
            }
        });

        actionForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            if (res.selection === BUTTON_CHANGE_SORT) {
                const newSortBy = sortBy === SORT_BY.DISTANCE ? SORT_BY.ALPHABETICAL : SORT_BY.DISTANCE;
                showWarpsListMenuWithOptions(player, warps, newSortBy, mode, selectedCategory, selectedIcon, categoryWarps);
                return;
            }

            if (res.selection === BUTTON_SHOW_SUBCATEGORIES) {
                const warpsForIcons = categoryWarps !== null ? categoryWarps : warps;
                showSubcategoriesMenu(player, warpsForIcons, sortBy, mode, selectedCategory, selectedIcon);
                return;
            }

            const warpIndex = res.selection - 2;
            if (warpIndex >= 0 && warpIndex < sortedWarps.length) {
                const selectedWarp = sortedWarps[warpIndex];
                if (mode === WARP_MENU.TELEPORT) {
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
                getWarpDetails(warp, player, "warps:warp_details.body", false)
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
            text: getWarpDetails(warp, null, "warps:sign_text", true),
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
            const warpDimension = getWarpDimension(warp.dimension);
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
            const warpDimension = getWarpDimension(warp.dimension);
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
        if (category && iconName) {
            const categoryIcons = getIconsByCategory(category);
            const selectedIcon = categoryIcons.find(icon => icon.name === iconName);
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
            .label({rawtext: [{translate: "warps:field.category.label"}]})
            .label({
                rawtext: [{
                    translate: "§l%%s§r", with: {
                        rawtext: [{translate: icon.translatedCategory}]
                    }
                }]
            })
            .label({rawtext: [{translate: "warps:field.icon.label"}]})
            .label({
                rawtext: [{
                    translate: "§l%%s§r", with: {
                        rawtext: [{translate: icon.translatedName}]
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

            const warpNameIndex = 4
            const targetLocationXIndex = 5
            const targetLocationYIndex = 6
            const targetLocationZIndex = 7
            const signModeIndex = 8
            const signMaterialIndex = 9
            const visibilityIndex = 10

            if (!res.formValues || !res.formValues[warpNameIndex] || !res.formValues[targetLocationXIndex] || !res.formValues[targetLocationYIndex] || !res.formValues[targetLocationZIndex] || res.formValues[signModeIndex] === undefined || res.formValues[signMaterialIndex] === undefined || res.formValues[visibilityIndex] === undefined) {
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

            const newWarpName = res.formValues[0]?.toString().trim();
            const newSignModeIndex = res.formValues[1];
            const newSignMode = Object.values(SIGN_MODE)[newSignModeIndex] || Object.values(SIGN_MODE)[0];
            const newSignMaterialIndex = res.formValues[2];
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
            if (warps[warpIndex].facing) {
                warps[warpIndex].facing = null;
            }
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
                currentX - 3,
                currentX + 3,
                {defaultValue: currentX}
            )
            .slider(
                {rawtext: [{translate: "warps:field.y.label"}]},
                currentY - 3,
                currentY + 3,
                {defaultValue: currentY}
            )
            .slider(
                {rawtext: [{translate: "warps:field.z.label"}]},
                currentZ - 3,
                currentZ + 3,
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
            {translate: `warps:visibility.${newVisibility.toString()}.label`}
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
            .body({rawtext: [{translate: "warps:main_menu.body"}]});

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
                case BUTTON_TELEPORT:
                    showCategoriesListMenu(player, WARP_MENU.TELEPORT);
                    break;
                case BUTTON_MANAGEMENT:
                    showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                    break;
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
    // === Initialization ===
    const init = () => {
        ///=================================================================================================================
        // === Command Registration ===
        Minecraft.system.beforeEvents.startup.subscribe((event) => {
            console.info("[WARP] Loaded Script")

            event.customCommandRegistry.registerEnum("warps:icon", WARP_ICONS.filter(icon => icon && icon.name).map(icon => icon.name));
            event.customCommandRegistry.registerEnum("warps:sign_mode", Object.values(SIGN_MODE));
            event.customCommandRegistry.registerEnum("warps:sign_material", Object.values(SIGN_MATERIAL));

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARPS_TP,
                    description: "Warp to a specific location (public Warps)",
                    permissionLevel: Minecraft.CommandPermissionLevel.Any,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name"
                    }],
                },
                (origin, warpName = "") => {
                    system.run(() => {
                        const player = getPlayer(origin)
                        if (!player) return;
                        if (warpName !== "") {
                            teleportToWarpByName(player, warpName)
                        } else {
                            showCategoriesListMenu(player, WARP_MENU.TELEPORT);
                        }
                    });
                    return {
                        status: CustomCommandStatus.Success,
                    };
                }
            );

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARPS_LIST,
                    description: "List all Warps",
                    permissionLevel: Minecraft.CommandPermissionLevel.Any,
                },
                (origin) => {
                    system.run(() => {
                        const player = getPlayer(origin)
                        player.sendMessage({translate: "warps:menu.filter_all"});
                        getValidWarps().forEach(warp => player.sendMessage(
                            getWarpDetails(warp, player, "warps:list_all", false)
                        ))
                    });
                    return {
                        status: CustomCommandStatus.Success,
                    };
                }
            );

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARPS_ADD,
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
                (origin, warpName, iconName, location, signMode, signMaterial) => {
                    system.run(() => {
                        const player = getPlayer(origin)
                        if (!player) return;

                        const targetLocation = roundLocation(location || player.location);
                        const warpDimensionId = getPlayerDimension(player);
                        if (warpName && iconName && targetLocation && signMode && signMaterial) {
                            const icon = getIconByName(iconName);
                            // const signMode = SIGN_MODE[(Math.abs(targetLocation.x - player.location.x) > Math.abs(targetLocation.z - player.location.z))]
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
            );

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARP_RENAME,
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
                (origin, oldWarpName = "", newWarpName = "") => {
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
                            showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                        }
                    })
                }
            );

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARP_SIGN_CHANGE,
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
                (origin, warpName, signMode, signMaterial) => {
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
                            showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                        }
                    })
                }
            );

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARP_ICON_CHANGE,
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
                (origin, warpName, iconName) => {
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
                            showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                        }
                    })
                }
            );

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARP_REMOVE,
                    description: "Remove a public Warp",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }],
                },
                (origin, warpName = "") => {
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
                            showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                        }
                    })
                }
            );

            event.customCommandRegistry.registerCommand(
                {
                    name: COMMAND_WARPS_REGEN_SIGNS,
                    description: "Regenerate all warp signs",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                },
                (origin) => {
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
