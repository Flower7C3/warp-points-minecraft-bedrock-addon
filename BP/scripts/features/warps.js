import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"
import {
    BlockPermutation,
    CustomCommandParamType,
    CustomCommandStatus,
    DyeColor,
    LocationInUnloadedChunkError,
    LocationWaypoint,
    SignSide,
    WaypointTexture,
    system
} from "@minecraft/server"

const Warps = () => {
    ///=================================================================================================================
    // === Constants (module scope) ===
    const WORLD_PROP = "warps:data";
    const WORLD_FAVORITES_PROP = "warps:favorites";
    /** Bedrock dynamic property value max length (chars). Use chunked save when JSON exceeds this. */
    const MAX_DYNAMIC_PROP_LENGTH = 32000;
    const WARP_MENU_ITEM_ID = "warps:warp_menu";
    const WARP_MAP_ITEM_ID = "warps:warp_map";

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

    /** Resolve warp.translationPattern (stored value from SIGN_TRANSLATION_PATTERN or legacy index) to TRANSLATION_PATTERN string. */
    const getWarpTranslationPattern = (warp) => {
        const v = warp.translationPattern;
        const keys = Object.keys(SIGN_TRANSLATION_PATTERN);
        const values = Object.values(SIGN_TRANSLATION_PATTERN);
        let signKey;
        const idx = Number(v);
        if (Number.isFinite(idx) && idx >= 0 && idx < values.length) {
            signKey = keys[idx];
        } else {
            const entry = Object.entries(SIGN_TRANSLATION_PATTERN).find(([, val]) => val === v);
            signKey = entry ? entry[0] : keys[0];
        }
        return TRANSLATION_PATTERN[`SIGN_${signKey}`] ?? TRANSLATION_PATTERN.SIGN_NAME_SOLO;
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
        BODY: "[coordsLabel]: §l[coordsValue]§r\n[dimensionLabel]: §l[dimensionName]§r\n[distanceLabel]: §l[distanceKmValue]§r (§l[distanceMetersLocale]§r)\n[directionLabel]: §l[directionText] [directionSign]§r\n[categoryLabel]: §l[categoryName]§r\n[iconLabel]: §l[iconName]§r\n\n[mapHeader]\n[mapGrid]\n[mapFooter]\n\n[translationPatternLabel]: §l[translationPatternValue]§r\n[signModeLabel]: §l[signModeValue]§r\n[signMaterialLabel]: §l[signMaterialValue]§r\n\n[ownerLabel]: §l[ownerName]§r\n[visibilityLabel]: §l[visibilityName]§r",
        BUTTON_LONG: "[visibilitySymbol] §l[warpName]§r [distanceDirectionValue] [directionSign]",
        BUTTON_SHORT: "[visibilitySymbol] §l[warpName]§r [coordsValue] [dimensionName]",
        LIST_ALL: "[visibilitySymbol] §l[warpName]§r [coordsValue] [dimensionName] ([categoryName]/[iconName])",
        SIGN_NAME_WITH_CATEGORY: "❣ §l[warpName]§r ([categoryName])",
        SIGN_NAME_WITH_ICON: "❣ §l[warpName]§r ([iconName])",
        SIGN_NAME_SOLO: "❣ §l[warpName]§r",
    })

    const SIGN_TRANSLATION_PATTERN = Object.freeze({
        NAME_WITH_CATEGORY: "name_with_category",
        NAME_WITH_ICON: "name_with_icon",
        NAME_SOLO: "name_solo",
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

    /** Locator behavior config (single place to tune waypoint UX). */
    const LOCATOR_CONFIG = Object.freeze({
        enabled: true,
        showMessages: true,
        /** Use null to keep native bar.maxCount limit. */
        maxWaypointsOverride: null,
        /** Default/fallback texture key from WaypointTexture. */
        texture: "Circle",
        color: Object.freeze({red: 0.2, green: 0.6, blue: 1}),
        /**
         * Visibility style synced with lang symbols:
         * private=§9■, protected=§e◆, public=§f◎
         */
        visibilityStyles: Object.freeze({
            private: Object.freeze({
                texture: "Square",
                color: Object.freeze({red: 0.333, green: 0.333, blue: 1.0}),
            }),
            protected: Object.freeze({
                texture: "Diamond",
                color: Object.freeze({red: 1.0, green: 1.0, blue: 0.333}),
            }),
            public: Object.freeze({
                texture: "Circle",
                color: Object.freeze({red: 1.0, green: 1.0, blue: 1.0}),
            }),
        }),
        /** If false, duplicate check ignores Y level (X/Z + dimension only). */
        matchExactY: true
    });

    ///=================================================================================================================
    // === Data Management Functions ===
    const loadWarps = () => {
        const chunkCount = Minecraft.world.getDynamicProperty(WORLD_PROP + "_n");
        let saved;
        if (chunkCount !== undefined && chunkCount !== null) {
            const n = Number(chunkCount);
            if (!Number.isInteger(n) || n < 1) {
                if (!isDataLoaded()) dataLoaded = true;
                return [];
            }
            const parts = [];
            for (let i = 0; i < n; i++) {
                const part = Minecraft.world.getDynamicProperty(WORLD_PROP + "_" + i)?.toString();
                if (part) parts.push(part);
            }
            saved = parts.join("");
        } else {
            saved = Minecraft.world.getDynamicProperty(WORLD_PROP)?.toString();
        }
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
                if (!warp.translationPattern) {
                    warp.translationPattern = Object.values(SIGN_TRANSLATION_PATTERN)[0];
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

    const loadFavorites = () => {
        const saved = Minecraft.world.getDynamicProperty(WORLD_FAVORITES_PROP)?.toString();
        if (!saved) return {};
        try {
            const parsed = JSON.parse(saved);
            if (!parsed || typeof parsed !== "object") return {};
            return parsed;
        } catch {
            return {};
        }
    };

    const saveFavorites = (favorites) => {
        Minecraft.world.setDynamicProperty(WORLD_FAVORITES_PROP, JSON.stringify(favorites));
    };

    const cleanupFavoritesData = (favorites) => {
        const validKeys = new Set(getValidWarps().map((warp) => getWarpLocatorKey(warp)));
        const cleaned = {};
        let changed = false;

        Object.entries(favorites || {}).forEach(([playerName, keys]) => {
            if (!Array.isArray(keys) || playerName === "") {
                changed = true;
                return;
            }
            const uniqueValid = Array.from(new Set(keys.map((k) => String(k))))
                .filter((k) => validKeys.has(k));

            if (uniqueValid.length > 0) {
                cleaned[playerName] = uniqueValid;
            }

            if (uniqueValid.length !== keys.length) {
                changed = true;
            }
        });

        if (Object.keys(cleaned).length !== Object.keys(favorites || {}).length) {
            changed = true;
        }

        return {cleaned, changed};
    };

    const cleanupFavoritesStorage = () => {
        const favorites = loadFavorites();
        const {cleaned, changed} = cleanupFavoritesData(favorites);
        if (changed) saveFavorites(cleaned);
        return cleaned;
    };

    const getPlayerFavoriteWarpKeys = (player) => {
        const allFavorites = cleanupFavoritesStorage();
        const list = allFavorites?.[String(player?.name || "")];
        if (!Array.isArray(list)) return new Set();
        return new Set(list.map(v => String(v)));
    };

    const setPlayerFavoriteWarpKeys = (player, keysSet) => {
        const allFavorites = cleanupFavoritesStorage();
        const playerName = String(player?.name || "");
        if (!playerName) return;
        const validKeys = new Set(getValidWarps().map((warp) => getWarpLocatorKey(warp)));
        const keys = Array.from(keysSet).map((k) => String(k)).filter((k) => validKeys.has(k));
        if (keys.length > 0) {
            allFavorites[playerName] = keys;
        } else {
            delete allFavorites[playerName];
        }
        saveFavorites(allFavorites);
    };

    const getWarpLocatorKey = (warp) => {
        const dim = String(warp?.dimension || "overworld");
        const x = Number(warp?.x);
        const y = Number(warp?.y);
        const z = Number(warp?.z);
        return `${dim}:${x},${y},${z}`;
    };

    const syncPlayerLocatorFromFavorites = (player) => {
        try {
            if (!isLocatorBarAvailable(player)) return;
            const favoriteKeys = getPlayerFavoriteWarpKeys(player);
            if (favoriteKeys.size === 0) return;
            const favoriteWarps = filterWarpsByVisibility(getValidWarps(), player)
                .filter((warp) => favoriteKeys.has(getWarpLocatorKey(warp)));
            favoriteWarps.forEach((warp) => addWarpToLocatorBar(player, warp, {silent: true, persist: false}));
        } catch (e) {
            console.error(`[WARP] Failed to restore favorites for ${player?.name}:`, e);
        }
    };

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

    const persistWarpsListToWorld = (warps) => {
        const json = JSON.stringify(warps);
        if (json.length <= MAX_DYNAMIC_PROP_LENGTH) {
            Minecraft.world.setDynamicProperty(WORLD_PROP, json);
            const oldN = Minecraft.world.getDynamicProperty(WORLD_PROP + "_n");
            if (oldN !== undefined && oldN !== null) {
                for (let i = 0; i < Number(oldN); i++) {
                    Minecraft.world.setDynamicProperty(WORLD_PROP + "_" + i, null);
                }
                Minecraft.world.setDynamicProperty(WORLD_PROP + "_n", null);
            }
        } else {
            const numChunks = Math.ceil(json.length / MAX_DYNAMIC_PROP_LENGTH);
            for (let i = 0; i < numChunks; i++) {
                const start = i * MAX_DYNAMIC_PROP_LENGTH;
                const chunk = json.slice(start, start + MAX_DYNAMIC_PROP_LENGTH);
                Minecraft.world.setDynamicProperty(WORLD_PROP + "_" + i, chunk);
            }
            Minecraft.world.setDynamicProperty(WORLD_PROP + "_n", String(numChunks));
            Minecraft.world.setDynamicProperty(WORLD_PROP, null);
        }
        cleanupFavoritesStorage();
    };

    /**
     * @param {import("@minecraft/server").Player} player
     * @param {string} action SAVE_ACTION.*
     * @param {*} warps
     * @param {*} warp
     * @param {string|null} translateKey pass null to skip message/sound branch side-effects
     * @param {Array} translateParams
     * @param {{silentPersistence?: boolean, skipDetailsMenuOnUpdate?: boolean}} [saveOptions]
     */
    const saveWarps = (player, action, warps, warp, translateKey, translateParams = [], saveOptions = {}) => {
        persistWarpsListToWorld(warps);

        const wx = Number(warp.x);
        const wy = Number(warp.y);
        const wz = Number(warp.z);
        let soundId;
        if (!saveOptions.silentPersistence) {
            switch (action) {
                case SAVE_ACTION.CREATE:
                    soundId = "beacon.activate"
                    player.dimension.runCommand(`summon fireworks_rocket ${wx} ${wy} ${wz}`);
                    updateWarpSigns();
                    break;
                case SAVE_ACTION.UPDATE:
                    soundId = "beacon.power"
                    player.dimension.runCommand(`particle minecraft:witchspell_emitter ${wx} ${wy} ${wz}`);
                    updateWarpSign(warp);
                    if (!saveOptions.skipDetailsMenuOnUpdate) {
                        showWarpDetailsMenu(player, warp);
                    }
                    break;
                case SAVE_ACTION.DELETE:
                    soundId = "beacon.deactivate"
                    player.dimension.runCommand(`particle minecraft:critical_hit_emitter ${wx} ${wy} ${wz}`);
                    removeWarpSign(warp);
                    break;
            }

            if (soundId) {
                player.playSound(soundId, player.location);
            }
        }

        if (translateKey !== null && translateKey !== undefined && String(translateKey).length > 0 && !saveOptions.silentPersistence) {
            // Build message: use only primitive strings so native API does not throw "Native variant type conversion failed".
            const withStrings = translateParams.map(param => {
                if (param === null || param === undefined) return '';
                if (typeof param === 'object' && typeof param.text === 'string') return param.text;
                return String(param);
            });
            const msgKey = String(translateKey);
            try {
                player.sendMessage({
                    translate: msgKey,
                    with: withStrings
                });
            } catch (e) {
                try {
                    player.sendMessage(msgKey + (withStrings.length ? ' ' + withStrings.join(', ') : ''));
                } catch (_) {
                    player.sendMessage('[Warp] OK');
                }
            }
        }
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

    const roundLocation = (location) => {
        if (!location) return null;
        const x = Number(location.x ?? location.blockX ?? 0);
        const y = Number(location.y ?? location.blockY ?? 0);
        const z = Number(location.z ?? location.blockZ ?? 0);
        return {x: Math.round(x), y: Math.round(y), z: Math.round(z)};
    }

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
    const filterWarpsByLocatorBar = (warps, player) => {
        const favoriteKeys = getPlayerFavoriteWarpKeys(player);
        if (favoriteKeys.size === 0) return [];
        return warps.filter(warp => favoriteKeys.has(getWarpLocatorKey(warp)));
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

    const normalizeDimensionIdForWorld = (dimensionId) =>
        String(dimensionId || "overworld").replace(/^minecraft:/, "");

    const getDimensionByName = (dimensionId) =>
        Minecraft.world.getDimension(`minecraft:${normalizeDimensionIdForWorld(dimensionId)}`);

    const notifyLocator = (player, key, withValues = []) => {
        if (!LOCATOR_CONFIG.showMessages) return;
        player.sendMessage({translate: key, with: withValues});
    };

    const getLocatorTexture = (warp) => {
        const visibility = String(warp?.visibility || WARP_VISIBILITY.PUBLIC);
        const preferredTexture = LOCATOR_CONFIG.visibilityStyles?.[visibility]?.texture || LOCATOR_CONFIG.texture;
        const selected = WaypointTexture?.[preferredTexture];
        if (selected !== undefined) return selected;
        return WaypointTexture?.Circle;
    };

    const getLocatorColor = (warp) => {
        const visibility = String(warp?.visibility || WARP_VISIBILITY.PUBLIC);
        const candidate = LOCATOR_CONFIG.visibilityStyles?.[visibility]?.color;
        if (candidate && typeof candidate.red === "number" && typeof candidate.green === "number" && typeof candidate.blue === "number") {
            return candidate;
        }
        return LOCATOR_CONFIG.color;
    };

    /** Locator bar (waypoints on HUD) — uses player.locatorBar and LocationWaypoint from @minecraft/server */
    const getWarpDimensionLocation = (warp) => {
        const dimId = (warp.dimension != null && String(warp.dimension)) ? String(warp.dimension) : "overworld";
        return {
            dimension: getDimensionByName(dimId),
            x: Number(warp.x),
            y: Number(warp.y),
            z: Number(warp.z)
        };
    };
    const waypointMatchesWarp = (waypoint, warp) => {
        try {
            const loc = waypoint.getDimensionLocation();
            const dimId = (loc.dimension && loc.dimension.id) ? String(loc.dimension.id).replace("minecraft:", "") : "";
            const sameDimension = dimId === String(warp.dimension || "overworld");
            const sameX = Number(loc.x) === Number(warp.x);
            const sameZ = Number(loc.z) === Number(warp.z);
            if (!sameDimension || !sameX || !sameZ) return false;
            if (!LOCATOR_CONFIG.matchExactY) return true;
            return Number(loc.y) === Number(warp.y);
        } catch {
            return false;
        }
    };
    const isLocatorBarAvailable = (player) => {
        try {
            return LOCATOR_CONFIG.enabled && player.locatorBar != null && typeof LocationWaypoint === "function";
        } catch {
            return false;
        }
    };
    const hasWarpOnLocatorBar = (player, warp) => {
        try {
            const bar = player.locatorBar;
            if (!bar || typeof bar.getAllWaypoints !== "function") return false;
            const waypoints = bar.getAllWaypoints();
            return waypoints.some((w) => waypointMatchesWarp(w, warp));
        } catch {
            return false;
        }
    };
    const addWarpToLocatorBar = (player, warp, options = {}) => {
        const silent = options?.silent === true;
        const persist = options?.persist !== false;
        try {
            const bar = player.locatorBar;
            if (!bar || typeof bar.addWaypoint !== "function") {
                if (!silent) notifyLocator(player, "warps:locator.not_available");
                return;
            }
            const configuredLimit = Number(LOCATOR_CONFIG.maxWaypointsOverride);
            const limit = Number.isInteger(configuredLimit) && configuredLimit > 0
                ? Math.min(configuredLimit, Number(bar.maxCount))
                : Number(bar.maxCount);
            if (Number(bar.count) >= limit) {
                if (!silent) notifyLocator(player, "warps:locator.limit_reached", [String(limit)]);
                return;
            }
            if (hasWarpOnLocatorBar(player, warp)) {
                if (!silent) notifyLocator(player, "warps:locator.already_added", [warp.name]);
                if (persist) {
                    const keys = getPlayerFavoriteWarpKeys(player);
                    keys.add(getWarpLocatorKey(warp));
                    setPlayerFavoriteWarpKeys(player, keys);
                }
                return;
            }
            const dimensionLocation = getWarpDimensionLocation(warp);
            const textureSelector = {textureBoundsList: [{lowerBound: 0, texture: getLocatorTexture(warp)}]};
            const waypoint = new LocationWaypoint(dimensionLocation, textureSelector, getLocatorColor(warp));
            bar.addWaypoint(waypoint);
            if (persist) {
                const keys = getPlayerFavoriteWarpKeys(player);
                keys.add(getWarpLocatorKey(warp));
                setPlayerFavoriteWarpKeys(player, keys);
            }
            if (!silent) notifyLocator(player, "warps:locator.added", [warp.name]);
        } catch (e) {
            if (!silent) notifyLocator(player, "warps:locator.not_available");
        }
    };
    const removeWarpFromLocatorBar = (player, warp, options = {}) => {
        const silent = options?.silent === true;
        const persist = options?.persist !== false;
        try {
            const bar = player.locatorBar;
            if (!bar || typeof bar.getAllWaypoints !== "function") {
                if (!silent) notifyLocator(player, "warps:locator.not_available");
                return;
            }
            const waypoints = bar.getAllWaypoints();
            const found = waypoints.find((w) => waypointMatchesWarp(w, warp));
            if (found) {
                bar.removeWaypoint(found);
                if (persist) {
                    const keys = getPlayerFavoriteWarpKeys(player);
                    keys.delete(getWarpLocatorKey(warp));
                    setPlayerFavoriteWarpKeys(player, keys);
                }
                if (!silent) notifyLocator(player, "warps:locator.removed", [warp.name]);
            } else {
                if (persist) {
                    const keys = getPlayerFavoriteWarpKeys(player);
                    keys.delete(getWarpLocatorKey(warp));
                    setPlayerFavoriteWarpKeys(player, keys);
                }
                if (!silent) notifyLocator(player, "warps:locator.not_on_locator", [warp.name]);
            }
        } catch (e) {
            if (!silent) notifyLocator(player, "warps:locator.not_available");
        }
    };

    /** 16-direction arrow (22.5° steps). 0° = ↑, clockwise. */
    const getArrow16 = (deg) => {
        const ARROWS_16 = [
            "↑ N", "↑↗ NNE ", "↗ NE", "→↗ NEE",
            "→ E", "→↘ SEE", "↘ SE", "↓↘ SSE",
            "↓ S", "↙↓ SSW ", "↙ SW", "↙← SWW",
            "← W", "↖← NWW", "↖ NW ", "↖↑ NNW",
        ];
        const d = Number(deg);
        if (!Number.isFinite(d)) return "↑";
        return ARROWS_16[Math.round(d / 22.5) % 16];
    };

    const getWarpDetails = (warp, player, pattern, options) => {
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
            translationPatternLabel: {translate: "warps:field.translation_pattern.label"},
            translationPatternValue: {translate: `warps:field.translation_pattern.value.${warp.translationPattern || Object.values(SIGN_TRANSLATION_PATTERN)[0]}`},
            signModeLabel: {translate: "warps:field.sign_mode.label"},
            signModeValue: {translate: `warps:field.sign_mode.value.${getWarpSignMode(warp)}`},
            signMaterialLabel: {translate: "warps:field.sign_material.label"},
            signMaterialValue: {translate: `warps:field.sign_material.value.${getWarpSignMaterial(warp)}`},
        }

        if (player && warp.dimension === getPlayerDimension(player)) {
            const DIRECTION_NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
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
                : getArrow16(relativeDeg);

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

        if (options && Object.prototype.hasOwnProperty.call(options, "warpDetailsTerrainEncoding")) {
            keys.mapHeader = {translate: "warps:warp_details.map_header"};
            const enc = options.warpDetailsTerrainEncoding;
            if (typeof enc === "string" && enc.length > 0) {
                keys.mapGrid = {text: terrainMapEncodingToColoredPseudoMap(enc)};
                keys.mapFooter = {
                    translate: "warps:warp_details.map_scale_footer",
                    with: [String(WARP_DETAILS_MAP_BLOCKS_PER_CELL)]
                };
            } else {
                keys.mapGrid = {translate: "warps:warp_details.map_no_data"};
                keys.mapFooter = {text: ""};
            }
        } else {
            keys.mapHeader = {text: ""};
            keys.mapGrid = {text: ""};
            keys.mapFooter = {text: ""};
        }

        const buildParts = (patt) => {
            const out = [];
            const regex = /\[([^\]]+)\]/g;
            let lastEnd = 0;
            let m;
            while ((m = regex.exec(patt)) !== null) {
                if (m.index > lastEnd) {
                    const literal = patt.slice(lastEnd, m.index);
                    if (literal.length > 0) out.push({text: literal});
                }
                const key = m[1];
                if (keys[key] !== undefined) out.push(keys[key]);
                lastEnd = m.index + m[0].length;
            }
            if (lastEnd < patt.length) {
                const literal = patt.slice(lastEnd);
                if (literal.length > 0) out.push({text: literal});
            }
            return out;
        };

        if (options && options.asSections === true) {
            const chunks = pattern.split(/\n\n/);
            const sections = [];
            for (const chunk of chunks) {
                const trimmed = chunk.replace(/\r$/, "").trim();
                if (trimmed.length > 0) {
                    const parts = buildParts(trimmed);
                    if (parts.length > 0) {
                        sections.push({type: "label", rawtext: parts});
                    }
                }
            }
            return sections;
        }

        const parts = buildParts(pattern);
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

    const openWarpByName = (player, warpName, teleportOnExact = false) => {
        if (!player) {
            return;
        }

        const query = warpName.trim();
        if (query === "") {
            const warps = filterWarpsByVisibility(getValidWarps(), player);
            if (warps.length === 0) {
                return player.sendMessage({translate: "warps:error.no_warps", with: [query]});
            }
            showWarpsListMenuWithOptions(player, warps, SORT_BY.DISTANCE, null, null, null, null, false);
            return;
        }

        const warps = filterWarpsByVisibility(getValidWarps(), player);
        const exactMatch = warps.find(w => w.name && w.name.toLowerCase() === query.toLowerCase());

        if (exactMatch) {
            if (teleportOnExact) {
                teleportToWarp(player, exactMatch);
            } else {
                showWarpDetailsMenu(player, exactMatch);
            }
            return;
        }

        const matching = searchWarpsByQuery(player, query);
        if (matching.length === 0) {
            return player.sendMessage({translate: "warps:error.warp_name_not_found", with: [query]});
        }

        showWarpsListMenuWithOptions(player, matching, SORT_BY.ALPHABETICAL, null, null, matching, query, false);
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
    const showSubcategoriesMenu = (player, warps, sortBy, selectedCategory, selectedIcon = null, query = null, showOnlyLocator = false) => {
        const iconsWithWarps = getIconsWithWarps(warps);
        const isSearchMode = query !== null && query !== undefined;

        if (iconsWithWarps.length === 0) {
            if (isSearchMode) {
                player.sendMessage({translate: "warps:search_results.no_icons_in_results"});
                showWarpsListMenuWithOptions(player, warps, sortBy, null, null, warps, query, showOnlyLocator);
            } else {
                showWarpsListMenuWithOptions(player, warps, sortBy, selectedCategory, selectedIcon, null, null, showOnlyLocator);
            }
            return;
        }

        const hasFirstButton = true;
        const subForm = new MinecraftUi.ActionFormData();

        if (isSearchMode) {
            subForm.title({
                rawtext: [{
                    translate: "warps:search_results.title", with: {
                        rawtext: [
                            {text: query},
                            {text: iconsWithWarps.length.toString()},
                        ]
                    }
                }]
            });
        } else {
            subForm.title({
                rawtext: [{
                    translate: "warps:manage_menu.title"
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
                    showWarpsListMenuWithOptions(player, warps, sortBy, null, null, warps, query, showOnlyLocator);
                } else {
                    showWarpsListMenuWithOptions(player, warps, sortBy, selectedCategory, null, null, null, showOnlyLocator);
                }
                return;
            }
            if (hasFirstButton && subRes.selection === BUTTON_BACK) {
                if (isSearchMode) {
                    showWarpsListMenuWithOptions(player, warps, sortBy, null, null, warps, query, showOnlyLocator);
                } else {
                    showWarpsListMenuWithOptions(player, warps, sortBy, selectedCategory, null, null, null, showOnlyLocator);
                }
                return;
            }
            const iconIndex = hasFirstButton ? subRes.selection - 1 : subRes.selection;
            if (iconIndex >= 0 && iconIndex < iconsWithWarps.length) {
                const chosenIcon = iconsWithWarps[iconIndex];
                const filteredWarps = filterWarpsByIcon(warps, chosenIcon.name);
                const categoryForChosenIcon = selectedCategory || chosenIcon.category || null;
                if (isSearchMode) {
                    showWarpsListMenuWithOptions(player, filteredWarps, sortBy, categoryForChosenIcon, chosenIcon, warps, query, showOnlyLocator);
                } else {
                    showWarpsListMenuWithOptions(player, filteredWarps, sortBy, categoryForChosenIcon, chosenIcon, warps, null, showOnlyLocator);
                }
            }
        });
    }

    /**
     * Wybór kategorii: pierwsza pozycja "Wszystkie", potem lista kategorii.
     * Pokazuje tylko kategorie mające warpy w bieżącym kontekście (pełna lista lub wyniki wyszukiwania).
     */
    const showCategoryPickerMenu = (player, warps, sortBy, selectedCategory, selectedIcon, categoryWarps, query, allWarpsForCategories = null, showOnlyLocator = false) => {
        const isSearchMode = query !== null && query !== undefined;
        const fullList = isSearchMode ? warps : (allWarpsForCategories ?? categoryWarps ?? warps);
        const categoriesWithWarps = getCategoriesWithWarps(fullList);

        const form = new MinecraftUi.ActionFormData();
        if (isSearchMode) {
            form.title({
                rawtext: [{
                    translate: "warps:search_results.title", with: {
                        rawtext: [
                            {text: query},
                            {text: categoriesWithWarps.length.toString()},
                        ]
                    }
                }]
            });
        } else {
            form.title({
                rawtext: [{translate: "warps:manage_menu.title"}]
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
                showWarpsListMenuWithOptions(player, warps, sortBy, selectedCategory, selectedIcon, categoryWarps, query, showOnlyLocator);
                return;
            }
            if (res.selection === 0) {
                showWarpsListMenuWithOptions(player, fullList, sortBy, null, null, null, query, showOnlyLocator);
                return;
            }
            const categoryIndex = res.selection - 1;
            if (categoryIndex >= 0 && categoryIndex < categoriesWithWarps.length) {
                const chosenCategory = categoriesWithWarps[categoryIndex];
                const filteredByCategory = filterWarpsByCategory(fullList, chosenCategory);
                showWarpsListMenuWithOptions(player, filteredByCategory, sortBy, chosenCategory, null, fullList, query, showOnlyLocator);
            }
        });
    }

    const showWarpsListMenuWithOptions = (player, warps, sortBy, selectedCategory = null, selectedIcon = null, categoryWarps = null, query = null, showOnlyLocator = false) => {
        const isSearchMode = query !== null && query !== undefined;
        const visibleWarps = filterWarpsByVisibility(warps, player);
        const baseWarps = showOnlyLocator ? filterWarpsByLocatorBar(visibleWarps, player) : visibleWarps;
        const sortedWarps = sortWarps([...baseWarps], sortBy, player);

        const actionForm = new MinecraftUi.ActionFormData();

        if (isSearchMode) {
            actionForm
                .title({
                    rawtext: [{
                        translate: "warps:search_results.title", with: {
                            rawtext: [
                                {text: query},
                                {text: sortedWarps.length.toString()}
                            ]
                        }
                    }]
                });
        } else {
            actionForm
                .title({
                    rawtext: [{
                        translate: "warps:manage_menu.title"
                    }]
                });
        }

        const iconObj = selectedIcon && typeof selectedIcon === "object" ? selectedIcon : (selectedIcon ? getIconByName(selectedIcon) : null);
        const categoryKey = selectedCategory ? `warps:category.${selectedCategory}` : (iconObj && iconObj.category ? `warps:category.${iconObj.category}` : null);

        actionForm.body("");
        let buttonIndex = 0;

        const BUTTON_FILTER_CATEGORY = buttonIndex++;
        const categoryButtonText = selectedCategory
            ? {
                rawtext: [{
                    translate: "warps:menu.button_category_current",
                    with: {rawtext: [{translate: categoryKey}]}
                }]
            }
            : {rawtext: [{translate: "warps:menu.filter_by_category"}]};
        actionForm.button(categoryButtonText);

        const BUTTON_FILTER_ICON = buttonIndex++;
        actionForm.button(
            selectedIcon && iconObj
                ? {
                    rawtext: [{
                        translate: "warps:menu.button_icon_current",
                        with: {rawtext: [{translate: iconObj.translatedName}]}
                    }]
                }
                : {rawtext: [{translate: "warps:menu.filter_by_icon"}]}
        );

        const BUTTON_SORT = buttonIndex++;
        actionForm.button(
            {
                rawtext: [{
                    translate:
                        sortBy === SORT_BY.DISTANCE
                            ? "warps:menu.meta_sort_distance"
                            : "warps:menu.meta_sort_alphabetical"
                }]
            }
        );

        const BUTTON_FAVORITES = buttonIndex++;
        actionForm.button({
            rawtext: [{
                translate:
                    showOnlyLocator
                        ? "warps:menu.meta_favorites_on"
                        : "warps:menu.meta_favorites_off"
            }]
        });

        actionForm.divider();

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
                showCategoryPickerMenu(player, warps, sortBy, selectedCategory, selectedIcon, categoryWarps, query, allWarpsForCategories, showOnlyLocator);
                return;
            }

            if (res.selection === BUTTON_FILTER_ICON) {
                const categoryForIconList = selectedCategory || (iconObj && iconObj.category) || null;
                const warpsForIconList = categoryForIconList
                    ? filterWarpsByCategory(categoryWarps !== null ? categoryWarps : warps, categoryForIconList)
                    : warps;
                showSubcategoriesMenu(player, warpsForIconList, sortBy, categoryForIconList, selectedIcon, query, showOnlyLocator);
                return;
            }

            if (res.selection === BUTTON_SORT) {
                const newSortBy = sortBy === SORT_BY.DISTANCE ? SORT_BY.ALPHABETICAL : SORT_BY.DISTANCE;
                showWarpsListMenuWithOptions(player, warps, newSortBy, selectedCategory, selectedIcon, categoryWarps, query, showOnlyLocator);
                return;
            }

            if (res.selection === BUTTON_FAVORITES) {
                showWarpsListMenuWithOptions(player, warps, sortBy, selectedCategory, selectedIcon, categoryWarps, query, !showOnlyLocator);
                return;
            }

            const warpIndex = res.selection - 4;
            if (warpIndex >= 0 && warpIndex < sortedWarps.length) {
                const selectedWarp = sortedWarps[warpIndex];
                showWarpDetailsMenu(player, selectedWarp);
            }
        });
    }

    const showWarpDetailsMenu = (player, warp) => {
        const warpsList = getValidWarps();
        const warpLive = warpsList.find((w) => w.name === warp.name && w.dimension === warp.dimension)
            || warpsList.find((w) => w.name === warp.name)
            || warp;

        const locatorKey = getWarpLocatorKey(warpLive);
        let terrainEncoding = (typeof warpLive.terrainMap === "string" && warpLive.terrainMap.length > 0)
            ? warpLive.terrainMap
            : "";

        if (!terrainEncoding && player) {
            const cached = getPlayerWarpTerrainMapCache(player, locatorKey);
            if (cached) terrainEncoding = cached;
        }

        if (player && isPlayerWithinWarpTerrainRefreshRange(player, warpLive)) {
            const dim = getDimensionByName(warpLive.dimension);
            if (dim) {
                const fresh = generateWarpTerrainMapEncoding(
                    {x: warpLive.x, y: warpLive.y, z: warpLive.z},
                    getValidWarps(),
                    warpLive.dimension,
                    dim,
                    WARP_DETAILS_MAP_BLOCKS_PER_CELL
                );
                if (fresh) {
                    setPlayerWarpTerrainMapCache(player, locatorKey, fresh);
                    terrainEncoding = fresh;
                    if (!warpLive.terrainMap || String(warpLive.terrainMap).length === 0) {
                        const all = loadWarps();
                        const idx = all.findIndex((w) => w.name === warpLive.name);
                        if (idx >= 0) {
                            all[idx].terrainMap = fresh;
                            saveWarps(player, SAVE_ACTION.UPDATE, all, all[idx], null, [], {
                                silentPersistence: true,
                                skipDetailsMenuOnUpdate: true
                            });
                        }
                    }
                }
            }
        }

        const canEdit = canPlayerEditWarp(player, warpLive);
        const locatorAvailable = isLocatorBarAvailable(player);
        const hasOnLocator = locatorAvailable && hasWarpOnLocatorBar(player, warpLive);
        let buttonIndex = 0;

        const optionsForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.title",
                    with: {rawtext: [{text: warpLive.name}]}
                }]
            })
            .body("");

        const icon = getIconByName(warpLive.icon);

        const BUTTON_TELEPORT = buttonIndex++;
        optionsForm.button({
            rawtext: [{translate: "warps:warp_details.options.teleport"}]
        }, icon ? icon.path : "");

        const detailsSections = getWarpDetails(warpLive, player, TRANSLATION_PATTERN.BODY, {
            asSections: true,
            warpDetailsTerrainEncoding: terrainEncoding
        });
        detailsSections.forEach((section, i) => {
            optionsForm.label({rawtext: section.rawtext});
        });

        const BUTTON_LOCATOR = locatorAvailable ? buttonIndex++ : -1;
        if (locatorAvailable) {
            optionsForm.button({
                rawtext: [{translate: hasOnLocator ? "warps:warp_details.options.remove_from_locator" : "warps:warp_details.options.show_on_locator"}]
            });
        }

        const BUTTON_EDIT_COORDINATES = buttonIndex++;
        if (canEdit) {
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_coordinates"}]
            });
        }

        const BUTTON_EDIT_NAME = buttonIndex++;
        if (canEdit) {
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_name"}]
            });
        }

        const BUTTON_EDIT_SIGN = buttonIndex++;
        if (canEdit) {
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_sign"}]
            });
        }

        const BUTTON_EDIT_ICON = buttonIndex++;
        if (canEdit) {
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_icon"}]
            });
        }

        const hasVisibilityButton = warpLive.visibility !== WARP_VISIBILITY.PUBLIC;
        const BUTTON_CHANGE_VISIBILITY = hasVisibilityButton ? buttonIndex++ : -1;
        if (canEdit && hasVisibilityButton) {
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.change_visibility"}]
            });
        }

        const BUTTON_DELETE = buttonIndex++;
        if (canEdit) {
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.delete"}]
            });
        }
        optionsForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            if (res.selection === BUTTON_TELEPORT) {
                teleportToWarp(player, warpLive);
                return;
            }
            if (res.selection === BUTTON_LOCATOR) {
                if (hasOnLocator) {
                    removeWarpFromLocatorBar(player, warpLive);
                } else {
                    addWarpToLocatorBar(player, warpLive);
                }
                showWarpDetailsMenu(player, warpLive);
                return;
            }
            if (canEdit) {
                switch (res.selection) {
                    case BUTTON_EDIT_COORDINATES:
                        editWarpCoordinatesForm(player, warpLive);
                        break;
                    case BUTTON_EDIT_NAME:
                        editWarpNameForm(player, warpLive);
                        break;
                    case BUTTON_EDIT_SIGN:
                        editWarpSignForm(player, warpLive);
                        break;
                    case BUTTON_EDIT_ICON:
                        editWarpIconFormStep1(player, warpLive);
                        break;
                    case BUTTON_CHANGE_VISIBILITY:
                        editWarpVisibilityForm(player, warpLive);
                        break;
                    case BUTTON_DELETE:
                        removeWarpItemForm(player, warpLive);
                        break;
                }
            } else {
                player.sendMessage({translate: "warps:error.no_permission"});
            }
        });
    }


    ///=================================================================================================================
    // === Standing Sign Functions ===

    const WarpSign = (warpDimension, warp) => {
        const signMode = getWarpSignMode(warp);
        const translationPattern = getWarpTranslationPattern(warp);
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
            text: getWarpDetails(warp, null, translationPattern),
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
        translationPattern = "",
        iconName = "",
        targetLocation,
        warpDimensionId
    }) => {
        // If category and icon are already selected (e.g., after error), skip step 1 and 2
        if (iconName) {
            const selectedIcon = getIconByName(iconName);
            if (selectedIcon) {
                addWarpItemFormStep3(player, warpName, translationPattern, selectedIcon, targetLocation, warpDimensionId);
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
            addWarpItemFormStep2(player, warpName, translationPattern, selectedCategory, targetLocation, warpDimensionId);
        });
    }

    const addWarpItemFormStep2 = (player, warpName, translationPattern, category, targetLocation, warpDimensionId) => {
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

            addWarpItemFormStep3(player, warpName, translationPattern, selectedIcon, targetLocation, warpDimensionId);
        });
    }

    const addWarpItemFormStep3 = (player, warpName, translationPattern, icon, targetLocation, warpDimensionId, visibility = WARP_VISIBILITY.PROTECTED) => {
        // Step 3/3: Name, coordinates and visibility
        const signPatternValues = Object.values(SIGN_TRANSLATION_PATTERN);
        let currentTranslationPatternIndex = signPatternValues.indexOf(translationPattern);
        if (currentTranslationPatternIndex < 0) {
            const n = Number(translationPattern);
            if (Number.isFinite(n) && n >= 0 && n < signPatternValues.length) {
                currentTranslationPatternIndex = n;
            } else {
                currentTranslationPatternIndex = 0;
            }
        }
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
                {rawtext: [{translate: "warps:field.translation_pattern.label"}]},
                signPatternValues.map(type => ({
                    rawtext: [{translate: `warps:field.translation_pattern.value.${type}`}]
                })),
                {defaultValueIndex: currentTranslationPatternIndex}
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
            const translationPatternDropdownIndex = index++;
            const signModeIndex = index++;
            const signMaterialIndex = index++;
            const visibilityIndex = index++;

            if (!res.formValues || !res.formValues[warpNameIndex]
                || !res.formValues[targetLocationXIndex] || !res.formValues[targetLocationYIndex] || !res.formValues[targetLocationZIndex]
                || res.formValues[translationPatternDropdownIndex] === undefined
                || res.formValues[signModeIndex] === undefined
                || res.formValues[signMaterialIndex] === undefined
                || res.formValues[visibilityIndex] === undefined) {
                player.sendMessage({translate: "warps:error.fill_required"});
                // Show form again with filled data
                const currentVisibility = res.formValues && res.formValues[visibilityIndex] !== undefined
                    ? getVisibilityByIndex(res.formValues[visibilityIndex])
                    : visibility;
                const currentTranslationPattern = res.formValues && res.formValues[translationPatternDropdownIndex] !== undefined
                    ? signPatternValues[res.formValues[translationPatternDropdownIndex]] ?? signPatternValues[0]
                    : signPatternValues[currentTranslationPatternIndex];
                addWarpItemFormStep3(player, warpName, currentTranslationPattern, icon, targetLocation, warpDimensionId, currentVisibility);
                return;
            }

            warpName = res.formValues[warpNameIndex].replace('"', "'");
            const finalLocation = {
                x: parseFloat(res.formValues[targetLocationXIndex].toString()),
                y: parseFloat(res.formValues[targetLocationYIndex].toString()),
                z: parseFloat(res.formValues[targetLocationZIndex].toString())
            };
            const selectedTranslationPattern = signPatternValues[res.formValues[translationPatternDropdownIndex]] ?? signPatternValues[0];
            const selectedSignMode = Object.values(SIGN_MODE)[res.formValues[signModeIndex]] || Object.values(SIGN_MODE)[0];
            const selectedSignMaterial = Object.values(SIGN_MATERIAL)[res.formValues[signMaterialIndex]] || Object.values(SIGN_MATERIAL)[0];
            const selectedVisibility = getVisibilityByIndex(res.formValues[visibilityIndex]);
            addWarpItemSave(player, warpName, selectedTranslationPattern, icon, finalLocation, warpDimensionId, selectedSignMode, selectedSignMaterial, selectedVisibility);
        });
    }

    const addWarpItemSave = (player, warpName, translationPattern, icon, targetLocation, warpDimensionId, signMode = Object.values(SIGN_MODE)[0], signMaterial = Object.values(SIGN_MATERIAL)[0], visibility = WARP_VISIBILITY.PROTECTED) => {
        // Icon validation
        if (!icon || !icon.name) {
            player.sendMessage({translate: "warps:add.invalid_icon"});
            addWarpItemFormStep1(player, {warpName, translationPattern, targetLocation, warpDimensionId});
            return;
        }

        // Name validation
        if (!warpName || warpName.trim().length === 0) {
            player.sendMessage({translate: "warps:error.fill_required"});
            addWarpItemFormStep3(player, warpName, translationPattern, icon, targetLocation, warpDimensionId);
            return;
        }

        if (warpName.length > 50) {
            player.sendMessage({translate: "warps:add.name_too_long"});
            addWarpItemFormStep3(player, warpName, translationPattern, icon, targetLocation, warpDimensionId);
            return;
        }

        if (isNaN(targetLocation.x) || isNaN(targetLocation.y) || isNaN(targetLocation.z)) {
            player.sendMessage({translate: "warps:add.coords_must_be_number"});
            // Show form again with filled data (step 3/3, skipping category and icon selection)
            addWarpItemFormStep3(player, warpName, translationPattern, icon, targetLocation, warpDimensionId);
            return;
        }

        // Coordinate validation (reasonable limits)
        // Y can be from -64 to 320 in Bedrock Edition (from version 1.18+)
        if (Math.abs(targetLocation.x) > 30000000 || targetLocation.y < -64 || targetLocation.y > 320 || Math.abs(targetLocation.z) > 30000000) {
            player.sendMessage({translate: "warps:add.coords_out_of_range"});
            addWarpItemFormStep3(player, warpName, translationPattern, icon, targetLocation, warpDimensionId);
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
            addWarpItemFormStep3(player, warpName, translationPattern, icon, targetLocation, warpDimensionId);
            return;
        }
        if (warps.some(w => (w.x === targetLocation.x && w.y === targetLocation.y && w.z === targetLocation.z))) {
            player.sendMessage({
                translate: "warps:add.duplicate_location",
                with: [
                    {translate: `warps:dimension.${warpDimensionId}`},
                    {text: targetLocation.x.toString()},
                    {text: targetLocation.y.toString()},
                    {text: targetLocation.z.toString()},
                ]
            });
            // Show form again with filled data (step 3/3, skipping category and icon selection)
            addWarpItemFormStep3(player, warpName, translationPattern, icon, targetLocation, warpDimensionId);
            return;
        }

        const x = Number(targetLocation.x);
        const y = Number(targetLocation.y);
        const z = Number(targetLocation.z);
        const signPatternValues = Object.values(SIGN_TRANSLATION_PATTERN);
        const translationPatternValue = signPatternValues.includes(translationPattern)
            ? translationPattern
            : (signPatternValues[Number(translationPattern)] ?? signPatternValues[0]);
        const newWarp = {
            name: String(warpName),
            translationPattern: String(translationPatternValue),
            x,
            y,
            z,
            dimension: String(warpDimensionId),
            icon: String(icon.name),
            owner: String(player.name),
            visibility: String(visibility),
            signMode: String(signMode),
            signMaterial: String(signMaterial),
        };

        try {
            const mapDim = getDimensionByName(warpDimensionId);
            if (mapDim) {
                const warpsForMap = warps.concat([newWarp]);
                const enc = generateWarpTerrainMapEncoding(
                    {x, y, z},
                    warpsForMap,
                    warpDimensionId,
                    mapDim,
                    WARP_DETAILS_MAP_BLOCKS_PER_CELL
                );
                if (enc) newWarp.terrainMap = enc;
            }
        } catch (e) {
            console.error(`[WARP] terrain map on create: ${e}`);
        }

        warps.push(newWarp);
        saveWarps(player, SAVE_ACTION.CREATE, warps, newWarp, "warps:add.success", [
            warpName,
            String(x),
            String(y),
            String(z),
        ]);
        if (newWarp.terrainMap) {
            try {
                setPlayerWarpTerrainMapCache(player, getWarpLocatorKey(newWarp), newWarp.terrainMap);
            } catch {
                // ignore
            }
        }
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
            .submitButton({rawtext: [{translate: "warps:add.submit"}]})
            .show(player).then((res) => {
            if (res.canceled) {
                showWarpDetailsMenu(player, warp);
                return;
            }

            if (!res.formValues || res.formValues.length < 1 || res.formValues[0] === undefined) {
                player.sendMessage({translate: "warps:error.fill_required"});
                editWarpNameForm(player, warp);
                return;
            }

            const newWarpName = res.formValues[0]?.toString().trim();
            editWarpNameSave(player, warp, newWarpName);
        });
    }

    const editWarpNameSave = (player, warp, newWarpName) => {
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

        if (warps[warpIndex].name !== newWarpName) {
            removeWarpSign(warps[warpIndex]);
            warps[warpIndex].name = newWarpName;
            warps[warpIndex].facing = null;
            saveWarps(player, SAVE_ACTION.UPDATE, warps, warps[warpIndex], "warps:warp_details.edit_name.success", [
                warp.name,
                newWarpName,
            ]);
        } else {
            showWarpDetailsMenu(player, warp);
        }
    }

    ///=================================================================================================================
    // === WARP EDIT SIGN ===
    const editWarpSignForm = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!warp) {
            player.sendMessage({translate: "warps:error.warp_name_not_found"});
            return;
        }

        const signPatternValues = Object.values(SIGN_TRANSLATION_PATTERN);
        let currentTranslationPatternIndex = signPatternValues.indexOf(warp.translationPattern);
        if (currentTranslationPatternIndex < 0) {
            const n = Number(warp.translationPattern);
            if (Number.isFinite(n) && n >= 0 && n < signPatternValues.length) {
                currentTranslationPatternIndex = n;
            } else {
                currentTranslationPatternIndex = 0;
            }
        }
        const currentSignModeIndex = Object.values(SIGN_MODE).indexOf(getWarpSignMode(warp));
        const currentSignMaterialIndex = Object.values(SIGN_MATERIAL).indexOf(getWarpSignMaterial(warp));

        new MinecraftUi.ModalFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.edit_sign.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .dropdown(
                {rawtext: [{translate: "warps:field.translation_pattern.label"}]},
                signPatternValues.map(type => ({
                    rawtext: [{translate: `warps:field.translation_pattern.value.${type}`}]
                })),
                {defaultValueIndex: currentTranslationPatternIndex}
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

            if (!res.formValues || res.formValues.length < 3
                || res.formValues[0] === undefined
                || res.formValues[1] === undefined
                || res.formValues[2] === undefined) {
                player.sendMessage({translate: "warps:error.fill_required"});
                editWarpSignForm(player, warp);
                return;
            }

            const newTranslationPatternIndex = Number(res.formValues[0]);
            const newTranslationPattern = signPatternValues[newTranslationPatternIndex] ?? signPatternValues[0];
            const newSignMode = Object.values(SIGN_MODE)[res.formValues[1]] || Object.values(SIGN_MODE)[0];
            const newSignMaterial = Object.values(SIGN_MATERIAL)[res.formValues[2]] || Object.values(SIGN_MATERIAL)[0];

            editWarpSignSave(player, warp, newTranslationPattern, newSignMode, newSignMaterial);
        });
    }

    const editWarpSignSave = (player, warp, newTranslationPattern, newSignMode, newSignMaterial) => {
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

        const w = warps[warpIndex];
        const tp = String(newTranslationPattern);
        const sm = String(newSignMode);
        const mat = String(newSignMaterial);

        if (w.translationPattern !== tp || w.signMode !== sm || w.signMaterial !== mat) {
            removeWarpSign(w);
            w.translationPattern = tp;
            w.signMode = sm;
            w.signMaterial = mat;
            w.facing = null;
            saveWarps(player, SAVE_ACTION.UPDATE, warps, w, "warps:warp_details.edit_sign.success", [warp.name]);
        } else {
            showWarpDetailsMenu(player, warp);
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

            try {
                const mapDim = getDimensionByName(warps[warpIndex].dimension);
                if (mapDim) {
                    const enc = generateWarpTerrainMapEncoding(
                        {x: newX, y: newY, z: newZ},
                        warps,
                        warps[warpIndex].dimension,
                        mapDim,
                        WARP_DETAILS_MAP_BLOCKS_PER_CELL
                    );
                    if (enc) {
                        warps[warpIndex].terrainMap = enc;
                        try {
                            setPlayerWarpTerrainMapCache(player, getWarpLocatorKey(warps[warpIndex]), enc);
                        } catch {
                            // ignore
                        }
                    }
                }
            } catch (e) {
                console.error(`[WARP] terrain map on coords update: ${e}`);
            }

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
                removeWarpItemSave(player, warp);
            } else {
                showWarpDetailsMenu(player, warp);
            }
        })
    }

    const removeWarpItemSave = (player, warp) => {
        // Check permissions before deletion
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!warp) {
            player.sendMessage({translate: "warps:error.warp_not_found"});
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
    }

    ///=================================================================================================================
    // === Main Menu ===
    /** Main minimap: every warp cell uses ✕ (player center stays MAP_CHAR_PLAYER). */
    const MAP_CHAR_WARP_MAIN = "§6✖";
    /** Stored terrain map: this warp (map center). */
    const MAP_CHAR_WARP_DETAILS_SELF = "§b✖";
    /** Stored terrain map: other warps in the grid. */
    const MAP_CHAR_WARP_DETAILS_OTHER = "§6✖";
    const MAP_CHAR_PLAYER = "§b❂"; //"§b@";
    /** Block-drawing chars (similar cell width in Bedrock UI font). */
    const MAP_CHAR_UNLOADED = "§7▓"; //"§7▦";
    const MAP_CHAR_PATH = "§8█"; //"§8■";
    const MAP_CHAR_LAND = "§2█"; //"§2▩";
    const MAP_CHAR_WATER = "§9▒"; //"§9≈";
    const MAP_CHAR_AIR = "§7▓"; //"§7^";
    const MAP_CHAR_FOREST = "§a▒"; //"§a▲";
    /** Map grid (odd sizes → player centered). */
    const MAP_WIDTH = 21; //41;
    const MAP_HEIGHT = 21; //17
    const MAP_HALF_W = (MAP_WIDTH - 1) / 2;
    const MAP_HALF_H = (MAP_HEIGHT - 1) / 2;
    const MAP_SCALE_DEFAULT = 6;
    const MAP_SCALE_MIN = 1;
    const MAP_SCALE_MAX = 10;
    const PLAYER_MAP_SCALE_PROP = "warps:player_map_cell_scale";
    /** World DP fallback: player entity DP is not always writable in script. */
    const PLAYER_MAP_SCALE_WORLD_PREFIX = "warps:map_cell_scale";
    /** Vertical scan above/below hint Y to find a surface block (performance vs tall terrain). */
    const MAP_SURFACE_Y_ABOVE = 40;
    const MAP_SURFACE_Y_BELOW = 24;

    const clampMapScale = (n) => {
        const v = Math.round(Number(n));
        if (!Number.isFinite(v)) return MAP_SCALE_DEFAULT;
        return Math.min(MAP_SCALE_MAX, Math.max(MAP_SCALE_MIN, v));
    };

    // Slider represents "zoom level" (higher = closer). Internally we store "blocks per cell".
    // Example (min=1,max=10): zoom=10 => 1 block per cell; zoom=1 => 10 blocks per cell.
    const clampMapZoom = (n) => {
        const v = Math.round(Number(n));
        if (!Number.isFinite(v)) return MAP_SCALE_MAX - MAP_SCALE_DEFAULT + MAP_SCALE_MIN;
        return Math.min(MAP_SCALE_MAX, Math.max(MAP_SCALE_MIN, v));
    };
    const blocksPerCellToZoom = (blocksPerCell) =>
        clampMapZoom(MAP_SCALE_MAX - clampMapScale(blocksPerCell) + MAP_SCALE_MIN);
    const zoomToBlocksPerCell = (zoom) =>
        clampMapScale(MAP_SCALE_MAX - clampMapZoom(zoom) + MAP_SCALE_MIN);

    /** ModalForm: `.label()` may occupy `formValues[0]`; slider is often last. */
    const readModalMapScaleValue = (formValues, fallbackScale) => {
        if (!formValues || formValues.length === 0) return clampMapScale(fallbackScale);
        for (let i = formValues.length - 1; i >= 0; i--) {
            const raw = formValues[i];
            if (raw === undefined || raw === null || raw === "") continue;
            const n = Number(raw);
            if (!Number.isFinite(n)) continue;
            return clampMapScale(n);
        }
        return clampMapScale(fallbackScale);
    };

    const getPlayerMapScaleWorldKey = (player) => {
        const name = String(player?.name ?? "unknown").replace(/[^a-zA-Z0-9_\-]/g, "_");
        return `${PLAYER_MAP_SCALE_WORLD_PREFIX}:${name}`;
    };

    const getPlayerMapScale = (player) => {
        try {
            const w = Minecraft.world.getDynamicProperty(getPlayerMapScaleWorldKey(player));
            if (w !== undefined && w !== null) return clampMapScale(w);
        } catch {
            // ignore
        }
        try {
            const v = player.getDynamicProperty(PLAYER_MAP_SCALE_PROP);
            if (v === undefined || v === null) return MAP_SCALE_DEFAULT;
            return clampMapScale(v);
        } catch {
            return MAP_SCALE_DEFAULT;
        }
    };

    const setPlayerMapScale = (player, scale) => {
        const s = clampMapScale(scale);
        try {
            Minecraft.world.setDynamicProperty(getPlayerMapScaleWorldKey(player), s);
        } catch {
            // ignore
        }
        try {
            player.setDynamicProperty(PLAYER_MAP_SCALE_PROP, s);
        } catch {
            // ignore: older clients / missing API
        }
    };

    const isAirLike = (typeId) =>
        typeId === "minecraft:air" ||
        typeId === "minecraft:cave_air" ||
        typeId === "minecraft:void_air";

    const isRoadAsphaltOrMarking = (typeId) =>
        typeId === "minecraft:grass_path" ||
        typeId.startsWith("road_asphalt:") ||
        typeId.startsWith("road_marking:");

    const isWaterLike = (typeId) =>
        typeId === "minecraft:water" ||
        typeId === "minecraft:flowing_water" ||
        typeId === "minecraft:bubble_column" ||
        typeId.includes("kelp") ||
        typeId.includes("seagrass") ||
        typeId === "minecraft:ice" ||
        typeId === "minecraft:packed_ice" ||
        typeId === "minecraft:blue_ice" ||
        typeId === "minecraft:frosted_ice";

    const isForestLike = (typeId) =>
        typeId.endsWith("_log") ||
        typeId.includes("_leaves") ||
        typeId === "minecraft:vine" ||
        typeId.includes("mushroom_block") ||
        typeId === "minecraft:azalea" ||
        typeId === "minecraft:flowering_azalea" ||
        typeId === "minecraft:moss_block" ||
        typeId === "minecraft:moss_carpet" ||
        typeId.endsWith("_sapling");

    /** Thin blocks to skip when probing for ground/water (monospace map uses one glyph per column). */
    const isSurfacePassThrough = (typeId) =>
        typeId === "minecraft:short_grass" ||
        typeId === "minecraft:tall_grass" ||
        typeId === "minecraft:grass" ||
        typeId === "minecraft:dead_bush" ||
        typeId === "minecraft:snow_layer" ||
        typeId === "minecraft:vine" ||
        typeId.endsWith("_carpet") ||
        typeId.includes("_torch") ||
        typeId.endsWith("_pressure_plate") ||
        typeId.includes("rail") ||
        typeId.includes("sign") ||
        typeId.includes("_button") ||
        typeId === "minecraft:ladder" ||
        typeId === "minecraft:tripwire" ||
        typeId === "minecraft:tripwire_hook";

    const MAP_SURFACE_UNLOADED = "__warps_surface_unloaded__";
    const isUnloadedChunkError = (e) =>
        (e instanceof LocationInUnloadedChunkError) ||
        (typeof e?.name === "string" && e.name === "LocationInUnloadedChunkError");

    /**
     * Topmost meaningful block at (bx, bz) near hintY, or null (air column / error),
     * or MAP_SURFACE_UNLOADED when probing hits an unloaded chunk.
     */
    const sampleSurfaceBlock = (dimension, bx, bz, hintY, yAbove = MAP_SURFACE_Y_ABOVE, yBelow = MAP_SURFACE_Y_BELOW) => {
        const yMax = Math.min(319, Math.floor(hintY) + yAbove);
        const yMin = Math.max(-64, Math.floor(hintY) - yBelow);
        let y = yMax;
        while (y >= yMin) {
            let block;
            try {
                block = dimension.getBlock({x: bx, y, z: bz});
            } catch (e) {
                if (isUnloadedChunkError(e)) return MAP_SURFACE_UNLOADED;
                return null;
            }
            // In some engine versions, probing unloaded chunks returns undefined instead of throwing.
            if (!block) return MAP_SURFACE_UNLOADED;
            let typeId = block.typeId;
            if (isAirLike(typeId)) {
                y--;
                continue;
            }
            while (isSurfacePassThrough(typeId) && y > yMin) {
                y--;
                try {
                    block = dimension.getBlock({x: bx, y, z: bz});
                } catch (e) {
                    if (isUnloadedChunkError(e)) return MAP_SURFACE_UNLOADED;
                    return null;
                }
                if (!block) return MAP_SURFACE_UNLOADED;
                typeId = block.typeId;
                if (isAirLike(typeId)) break;
            }
            if (isAirLike(typeId)) {
                y--;
                continue;
            }
            return block;
        }
        return null;
    };

    /** Facing angle (°) consistent with getWarpDetails / atan2(dx,-dz), 0° = world north (−Z). */
    const getPlayerFacingDegrees = (player) => {
        try {
            const rotation = player.getRotation();
            const playerYaw = (typeof rotation.y === "number") ? rotation.y : 0;
            return (180 + playerYaw + 360) % 360;
        } catch {
            return 0;
        }
    };

    /** Unit forward (where the player looks) and right on XZ for view-aligned minimap; top row = forward. */
    const getPlayerMapOrientationXZ = (player) => {
        const F = getPlayerFacingDegrees(player) * Math.PI / 180;
        return {
            forwardX: Math.sin(F),
            forwardZ: -Math.cos(F),
            rightX: Math.cos(F),
            rightZ: Math.sin(F)
        };
    };

    const getWarpMapCellKey = (col, row) => `${col},${row}`;

    /**
     * Project a world point into pseudo-map grid coordinates.
     * Returns {col,row} integers, or null if outside map bounds.
     */
    const projectWorldToPseudoMapCell = (centerLocation, worldX, worldZ, cell, orient = null) => {
        const dx = worldX - centerLocation.x;
        const dz = worldZ - centerLocation.z;

        let colF;
        let rowF;
        if (orient) {
            // col axis = right, row axis = down (top row is forward)
            colF = (dx * orient.rightX + dz * orient.rightZ) / cell;
            const forward = (dx * orient.forwardX + dz * orient.forwardZ) / cell;
            rowF = -forward;
        } else {
            colF = dx / cell;
            rowF = dz / cell;
        }

        const col = Math.round(colF);
        const row = Math.round(rowF);
        if (Math.abs(col) > MAP_HALF_W || Math.abs(row) > MAP_HALF_H) return null;
        return {col, row};
    };

    /** World XZ for the center of pseudo-map cell (col, row); must match {@link projectWorldToPseudoMapCell} inverse. */
    const pseudoMapWorldXZAtCell = (centerLocation, col, row, mapScale, orient = null) => {
        if (orient) {
            return {
                x: centerLocation.x + orient.rightX * col * mapScale + orient.forwardX * (-row) * mapScale,
                z: centerLocation.z + orient.rightZ * col * mapScale + orient.forwardZ * (-row) * mapScale
            };
        }
        return {
            x: centerLocation.x + col * mapScale,
            z: centerLocation.z + row * mapScale
        };
    };

    /** Which warp (if any) occupies each grid cell; same rules as minimap raster. */
    const buildPseudoMapWarpByCell = (centerLocation, warps, dimensionId, mapScale, orient = null) => {
        const dimNorm = normalizeDimensionIdForWorld(dimensionId);
        const sameDim = warps.filter((w) => normalizeDimensionIdForWorld(w.dimension) === dimNorm);
        const warpByCell = new Map();
        for (const w of sameDim) {
            const cellPos = projectWorldToPseudoMapCell(centerLocation, w.x, w.z, mapScale, orient);
            if (!cellPos) continue;
            if (cellPos.col === 0 && cellPos.row === 0) continue;
            const k = getWarpMapCellKey(cellPos.col, cellPos.row);
            if (!warpByCell.has(k)) warpByCell.set(k, w);
        }
        return warpByCell;
    };

    /** Warp details / DB: blocks per pseudo-map cell (north = smaller row index = −Z). */
    const WARP_DETAILS_MAP_BLOCKS_PER_CELL = 5;
    const WARP_DETAILS_MAP_PLAYER_CACHE_PREFIX = "warps:warp_terrain_dp";

    const encodeTerrainCellFromSurface = (surface) => {
        if (surface === MAP_SURFACE_UNLOADED) return "u";
        if (!surface) return "a";
        const typeId = surface.typeId;
        if (isRoadAsphaltOrMarking(typeId)) return "r";
        if (isWaterLike(typeId)) return "w";
        if (isForestLike(typeId)) return "f";
        return "l";
    };

    /**
     * Single raster pass: compact ASCII grid (newlines between rows). Terrain: l/w/f/r/a/u.
     * Focal: {@link PSEUDO_MAP_ENCODING_FOCAL_WARP} = warp-details (persisted, north-up), {@link PSEUDO_MAP_ENCODING_FOCAL_PLAYER} = main menu (player center).
     * Other warps: {@link PSEUDO_MAP_ENCODING_WARP_OTHER}.
     */
    const PSEUDO_MAP_ENCODING_FOCAL_WARP = "c";
    const PSEUDO_MAP_ENCODING_FOCAL_PLAYER = "p";
    const PSEUDO_MAP_ENCODING_WARP_OTHER = "m";

    const generatePseudoMapRasterEncoding = (centerLocation, warps, dimensionId, dimension, opts) => {
        if (!dimension || !centerLocation) return "";
        const mapScale = opts.mapScale;
        const orient = opts.orient ?? null;
        const focalChar = opts.focalChar ?? PSEUDO_MAP_ENCODING_FOCAL_WARP;
        const hintY = centerLocation.y;
        const yAbove = MAP_SURFACE_Y_ABOVE;
        const yBelow = MAP_SURFACE_Y_BELOW;
        const warpByCell = buildPseudoMapWarpByCell(centerLocation, warps, dimensionId, mapScale, orient);
        const rows = [];
        for (let row = -MAP_HALF_H; row <= MAP_HALF_H; row++) {
            let rowStr = "";
            for (let col = -MAP_HALF_W; col <= MAP_HALF_W; col++) {
                if (row === 0 && col === 0) {
                    rowStr += focalChar;
                    continue;
                }
                if (warpByCell.has(getWarpMapCellKey(col, row))) {
                    rowStr += PSEUDO_MAP_ENCODING_WARP_OTHER;
                    continue;
                }
                const {x: worldX, z: worldZ} = pseudoMapWorldXZAtCell(centerLocation, col, row, mapScale, orient);
                const surface = sampleSurfaceBlock(dimension, Math.floor(worldX), Math.floor(worldZ), hintY, yAbove, yBelow);
                rowStr += encodeTerrainCellFromSurface(surface);
            }
            rows.push(rowStr);
        }
        return rows.join("\n");
    };

    const decodeTerrainCategoryEncodingChar = (ch) => {
        switch (ch) {
            case "l":
                return MAP_CHAR_LAND;
            case "w":
                return MAP_CHAR_WATER;
            case "f":
                return MAP_CHAR_FOREST;
            case "r":
                return MAP_CHAR_PATH;
            case "a":
                return MAP_CHAR_AIR;
            case "u":
                return MAP_CHAR_UNLOADED;
            default:
                return MAP_CHAR_LAND;
        }
    };

    const decodeTerrainEncodingChar = (ch) => {
        switch (ch) {
            case "c":
                return MAP_CHAR_WARP_DETAILS_SELF;
            case "m":
                return MAP_CHAR_WARP_DETAILS_OTHER;
            default:
                return decodeTerrainCategoryEncodingChar(ch);
        }
    };

    const decodeMainMapEncodingChar = (ch) => {
        switch (ch) {
            case "p":
                return MAP_CHAR_PLAYER;
            case "m":
                return MAP_CHAR_WARP_MAIN;
            default:
                return decodeTerrainCategoryEncodingChar(ch);
        }
    };

    const terrainMapEncodingToColoredPseudoMap = (encoding) => {
        if (!encoding || typeof encoding !== "string") return "";
        const lines = encoding.replace(/\r/g, "").split("\n");
        let out = "";
        for (const line of lines) {
            let row = "";
            for (let i = 0; i < line.length; i++) {
                row += decodeTerrainEncodingChar(line.charAt(i));
            }
            out += row + "\n";
        }
        return out.replace(/\n$/, "");
    };

    const terrainEncodingToMainMapColoredString = (encoding) => {
        if (!encoding || typeof encoding !== "string") return "";
        const lines = encoding.replace(/\r/g, "").split("\n");
        let out = "";
        for (const line of lines) {
            let row = "";
            for (let i = 0; i < line.length; i++) {
                row += decodeMainMapEncodingChar(line.charAt(i));
            }
            out += row + "\n";
        }
        return out.replace(/\n$/, "");
    };

    const isPlayerWithinWarpTerrainRefreshRange = (player, warp) => {
        if (!player || !warp) return false;
        if (warp.dimension !== getPlayerDimension(player)) return false;
        const maxDistance = 64;
        const maxDistanceSquared = maxDistance * maxDistance;
        const pl = player.location;
        const dx = warp.x - pl.x;
        const dy = warp.y - pl.y;
        const dz = warp.z - pl.z;
        return (dx * dx + dy * dy + dz * dz) <= maxDistanceSquared;
    };

    const getPlayerWarpTerrainCacheKey = (player, warpLocatorKey) => {
        const name = String(player?.name ?? "unknown").replace(/[^a-zA-Z0-9_\-]/g, "_");
        return `${WARP_DETAILS_MAP_PLAYER_CACHE_PREFIX}:${name}:${String(warpLocatorKey).replace(/[^a-zA-Z0-9_:,\-]/g, "_")}`;
    };

    const setPlayerWarpTerrainMapCache = (player, locatorKey, encoding) => {
        if (!player || !encoding) return;
        try {
            Minecraft.world.setDynamicProperty(getPlayerWarpTerrainCacheKey(player, locatorKey), encoding);
        } catch {
            try {
                player.setDynamicProperty(getPlayerWarpTerrainCacheKey(player, locatorKey), encoding);
            } catch {
                // ignore
            }
        }
    };

    const getPlayerWarpTerrainMapCache = (player, locatorKey) => {
        if (!player) return "";
        try {
            const w = Minecraft.world.getDynamicProperty(getPlayerWarpTerrainCacheKey(player, locatorKey));
            if (w !== undefined && w !== null) return String(w);
        } catch {
            // ignore
        }
        try {
            const v = player.getDynamicProperty(getPlayerWarpTerrainCacheKey(player, locatorKey));
            if (v !== undefined && v !== null) return String(v);
        } catch {
            // ignore
        }
        return "";
    };

    /**
     * Compact terrain description (ASCII per cell, newlines between rows). North at top (−Z).
     * c = this warp center, m = other warp, l/w/f/r/a/u = land/water/forest/road/air/unloaded.
     */
    const generateWarpTerrainMapEncoding = (centerLocation, warps, dimensionId, dimension, blocksPerCell = WARP_DETAILS_MAP_BLOCKS_PER_CELL) => {
        if (!dimension || !centerLocation) return "";
        const mapScale = Math.max(1, Math.round(Number(blocksPerCell)) || WARP_DETAILS_MAP_BLOCKS_PER_CELL);
        return generatePseudoMapRasterEncoding(centerLocation, warps, dimensionId, dimension, {
            mapScale,
            orient: null,
            focalChar: PSEUDO_MAP_ENCODING_FOCAL_WARP
        });
    };

    const generateMapString = (centerLocation, warps, dimensionId, dimension, mapOptions = {}) => {
        const mapScale = clampMapScale(mapOptions.mapScale ?? MAP_SCALE_DEFAULT);
        const orient = mapOptions.playerForMapRotation
            ? getPlayerMapOrientationXZ(mapOptions.playerForMapRotation)
            : null;
        const enc = generatePseudoMapRasterEncoding(centerLocation, warps, dimensionId, dimension, {
            mapScale,
            orient,
            focalChar: PSEUDO_MAP_ENCODING_FOCAL_PLAYER
        });
        return terrainEncodingToMainMapColoredString(enc);
    };

    /** Warps that would render as the §6 map marker (same dimension + grid as generateMapString). */
    const getWarpsVisibleOnPseudoMap = (centerLocation, warps, dimensionId, playerForViewMap = null, mapScale = MAP_SCALE_DEFAULT) => {
        const cell = clampMapScale(mapScale);
        const orient = playerForViewMap ? getPlayerMapOrientationXZ(playerForViewMap) : null;
        const warpByCell = buildPseudoMapWarpByCell(centerLocation, warps, dimensionId, cell, orient);
        const out = [];
        const seen = new Set();
        for (const w of warpByCell.values()) {
            const key = getWarpLocatorKey(w);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(w);
        }
        return out;
    };

    /** World north (0° = −Z) vs player view; on view-aligned map, top = forward so this is north on the printed grid. */
    const getMainMapNorthArrowForPlayer = (player) => {
        try {
            const playerFacingDeg = getPlayerFacingDegrees(player);
            const worldNorthDeg = 0;
            const relativeDeg = (worldNorthDeg - playerFacingDeg + 360) % 360;
            return getArrow16(relativeDeg);
        } catch {
            return "↑";
        }
    };

    const mapFooterRawWithScale = (mapScale) => {
        // Keep surrounding body text gray (§7) even after colored glyphs.
        const iconYou = `§7${MAP_CHAR_PLAYER}§7`;
        const iconWarp = `§7${MAP_CHAR_WARP_MAIN}§7`;
        const iconForest = `§7${MAP_CHAR_FOREST}§7`;
        const iconWater = `§7${MAP_CHAR_WATER}§7`;
        const iconLand = `§7${MAP_CHAR_LAND}§7`;
        const iconRoad = `§7${MAP_CHAR_PATH}§7`;
        const iconAir = `§7${MAP_CHAR_AIR}§7`;
        const iconUnloaded = `§7${MAP_CHAR_UNLOADED}§7`;

        return {
            rawtext: [
                {
                    translate: "warps:main_menu.map_footer_icons",
                    with: [
                        iconYou,
                        iconWarp,
                        iconForest,
                        iconWater,
                        iconLand,
                        iconRoad,
                        iconAir,
                        iconUnloaded
                    ]
                },
                {text: "\n"},
                {
                    translate: "warps:main_menu.map_footer_metrics",
                    with: [
                        String(MAP_WIDTH),
                        String(MAP_HEIGHT),
                        String(mapScale),
                        String(Math.round(MAP_HALF_W * mapScale)),
                        String(Math.round(MAP_HALF_H * mapScale))
                    ]
                }
            ]
        };
    };

    /**
     * One map function (single entry point).
     * - Shows modal with map + slider
     * - If slider changed → reopen itself with new scale
     * - Otherwise shows ActionForm with warp buttons
     */
    const showMainMenuMap = (player, options = {}) => {
        const returnToMainMenuOnCancel = options.returnToMainMenuOnCancel !== false;

        // Allow passing an explicit scale to re-render immediately even if persistence fails.
        // Internal value = blocks per cell (1 = closest, 10 = farthest).
        const scale = clampMapScale(options.scaleOverride ?? getPlayerMapScale(player));
        const visibleWarps = filterWarpsByVisibility(getValidWarps(), player);
        const dimensionId = getPlayerDimension(player);
        const northArrow = getMainMapNorthArrowForPlayer(player);
        const titleString = {
            rawtext: [
                {translate: "warps:main_menu.map_title"},
                {text: ` §f${northArrow}§r`}
            ]
        };
        const mapString = generateMapString(
            player.location,
            visibleWarps,
            dimensionId,
            player.dimension,
            {playerForMapRotation: player, mapScale: scale}
        );
        const footerString = mapFooterRawWithScale(scale);

        const form = new MinecraftUi.ActionFormData();
        form
            .title(titleString)
            .body(mapString)
            .label(footerString);

        let buttonIndex = 0;
        const BUTTON_SETTINGS = buttonIndex++;
        form.button({rawtext: [{translate: "warps:main_menu.map_settings"}]});

        const warpsOnMap = sortWarps(
            getWarpsVisibleOnPseudoMap(player.location, visibleWarps, dimensionId, player, scale),
            SORT_BY.DISTANCE,
            player
        );
        if (warpsOnMap.length > 0) {
            form.divider();
        }
        warpsOnMap.forEach((warp) => {
            try {
                const icon = getIconByName(warp.icon);
                form.button(
                    getWarpDetails(warp, player, TRANSLATION_PATTERN.BUTTON_LONG),
                    icon && icon.path ? icon.path : ""
                );
            } catch (error) {
                console.error(`[WARP] Map list button error for ${warp.name}:`, error);
            }
        });

        form.show(player).then((res) => {
            if (res.canceled) {
                if (returnToMainMenuOnCancel) showMainMenu(player);
                return;
            }

            if (res.selection === BUTTON_SETTINGS) {
                const zoomDefault = blocksPerCellToZoom(scale);
                const settingsForm = new MinecraftUi.ModalFormData();
                settingsForm
                    .title({rawtext: [{translate: "warps:main_menu.map_title"}]})
                    .slider(
                        {rawtext: [{translate: "warps:main_menu.map_scale_slider"}]},
                        MAP_SCALE_MIN,
                        MAP_SCALE_MAX,
                        {defaultValue: zoomDefault}
                    );

                settingsForm.show(player).then((settingsRes) => {
                    if (settingsRes.canceled) {
                        showMainMenuMap(player, {returnToMainMenuOnCancel, scaleOverride: scale});
                        return;
                    }
                    const newZoom = clampMapZoom(readModalMapScaleValue(settingsRes.formValues, zoomDefault));
                    const newScale = zoomToBlocksPerCell(newZoom);
                    if (newScale !== scale) setPlayerMapScale(player, newScale);
                    showMainMenuMap(player, {returnToMainMenuOnCancel, scaleOverride: newScale});
                });
                return;
            }

            const warpIndex = res.selection - 1; // account for Settings button
            const warp = warpsOnMap[warpIndex];
            if (warp) {
                showWarpDetailsMenu(player, warp);
                return;
            }
            showMainMenuMap(player, {returnToMainMenuOnCancel, scaleOverride: scale});
        });
    };

    const showMainMenu = (player) => {
        let buttonIndex = 0;
        const menuForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:main_menu.title"}]})
            .body("");

        const BUTTON_NEAREST = buttonIndex++;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.list_nearest"}]
        });
        const BUTTON_ALL = buttonIndex++;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.list_all"}]
        });
        const BUTTON_FAVORITES = buttonIndex++;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.list_favorites"}]
        });
        const BUTTON_MAP = buttonIndex++;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.map_open"}]
        });
        const BUTTON_ADD_NEW = buttonIndex++;
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.add_new"}]
        });

        menuForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            switch (res.selection) {
                case BUTTON_NEAREST: {
                    const nearestWarps = filterWarpsByVisibility(getValidWarps(), player);
                    if (nearestWarps.length === 0) {
                        player.sendMessage({translate: "warps:error.no_warps"});
                    } else {
                        showWarpsListMenuWithOptions(player, nearestWarps, SORT_BY.DISTANCE, null, null, null, null, false);
                    }
                    break;
                }
                case BUTTON_ALL: {
                    const allWarps = filterWarpsByVisibility(getValidWarps(), player);
                    if (allWarps.length === 0) {
                        player.sendMessage({translate: "warps:error.no_warps"});
                    } else {
                        showWarpsListMenuWithOptions(player, allWarps, SORT_BY.ALPHABETICAL, null, null, null, null, false);
                    }
                    break;
                }
                case BUTTON_FAVORITES: {
                    const favoriteWarpsBase = filterWarpsByVisibility(getValidWarps(), player);
                    const favoriteWarps = filterWarpsByLocatorBar(favoriteWarpsBase, player);
                    if (favoriteWarps.length === 0) {
                        player.sendMessage({translate: "warps:error.no_favorites"});
                    } else {
                        showWarpsListMenuWithOptions(player, favoriteWarpsBase, SORT_BY.ALPHABETICAL, null, null, null, null, true);
                    }
                    break;
                }
                case BUTTON_MAP:
                    showMainMenuMap(player, {listWarps: false});
                    break;
                case BUTTON_ADD_NEW:
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
            openWarpByName(player, warpName, true)
        });
        return {
            status: CustomCommandStatus.Success,
        };
    };
    const manageCommand = (origin, warpName = "") => {
        system.run(() => {
            const player = getPlayer(origin)
            openWarpByName(player, warpName, false)
        });
        return {
            status: CustomCommandStatus.Success,
        };
    };
    const listCommand = (origin, queryString) => {
        system.run(() => {
            const player = getPlayer(origin)
            const queriedWarps = (!queryString)
                ? getValidWarps()
                : searchWarpsByQuery(player, queryString)
            const sortedWarps = sortWarps([...queriedWarps], SORT_BY.ALPHABETICAL, player);
            player.sendMessage(
                (!queryString)
                    ? {
                        translate: "warps:menu.filter_all_count", with: {
                            rawtext: [
                                {text: sortedWarps.length.toString()}
                            ]
                        }
                    }
                    : {
                        rawtext: [{
                            translate: "warps:search_results.title", with: {
                                rawtext: [
                                    {text: queryString},
                                    {text: sortedWarps.length.toString()}
                                ]
                            }
                        }]
                    }
            );
            sortedWarps.forEach(warp => player.sendMessage(
                getWarpDetails(warp, player, TRANSLATION_PATTERN.LIST_ALL)
            ))
        });
        return {
            status: CustomCommandStatus.Success,
        };
    }
    const mapCommand = (origin) => {
        system.run(() => {
            const player = getPlayer(origin)
            showMainMenuMap(player, {returnToMainMenuOnCancel: false});
        });
        return {
            status: CustomCommandStatus.Success,
        };
    }
    const addCommand = (origin, warpName, translationPattern, signMode, signMaterial, iconName, location) => {
        system.run(() => {
            const player = getPlayer(origin)
            if (!player) return;

            const rawLoc = location || player.location;
            const targetLocation = roundLocation(rawLoc);
            const warpDimensionId = getPlayerDimension(player);
            const validCoords = targetLocation && Number.isFinite(targetLocation.x) && Number.isFinite(targetLocation.y) && Number.isFinite(targetLocation.z);
            if (warpName && iconName && validCoords && signMode && signMaterial) {
                const icon = getIconByName(iconName);
                addWarpItemSave(player, warpName, translationPattern, icon, targetLocation, warpDimensionId, signMode, signMaterial);
            } else {
                addWarpItemFormStep1(player, {
                    warpName: warpName,
                    translationPattern: translationPattern,
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
                editWarpNameSave(player, warp, newWarpName);
            }
        })
    }
    const updateSignCommand = (origin, warpName, signMode, signMaterial, translationPattern) => {
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
                const signPatternValues = Object.values(SIGN_TRANSLATION_PATTERN);
                let resolvedTranslationPattern;
                if (translationPattern !== undefined && translationPattern !== null && String(translationPattern).length > 0) {
                    if (signPatternValues.includes(translationPattern)) {
                        resolvedTranslationPattern = translationPattern;
                    } else {
                        const n = Number(translationPattern);
                        resolvedTranslationPattern = (Number.isFinite(n) && n >= 0 && n < signPatternValues.length)
                            ? signPatternValues[n]
                            : (warp.translationPattern ?? signPatternValues[0]);
                    }
                } else {
                    resolvedTranslationPattern = warp.translationPattern ?? signPatternValues[0];
                }
                editWarpSignSave(
                    player,
                    warp,
                    resolvedTranslationPattern,
                    signMode,
                    signMaterial
                );
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
                removeWarpItemSave(player, warp);
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

            event.customCommandRegistry.registerEnum("warps:translation_pattern", Object.values(SIGN_TRANSLATION_PATTERN));
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

            registerCommandWithAliases(event, ["warp_details", "wd"], {
                    description: "See Warp details",
                    permissionLevel: Minecraft.CommandPermissionLevel.Any,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name"
                    }],
                },
                manageCommand
            );

            registerCommandWithAliases(event, ["warps_list", "wl"], {
                    description: "List all Warps",
                    permissionLevel: Minecraft.CommandPermissionLevel.Any,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }],
                },
                listCommand
            );

            registerCommandWithAliases(event, ["warps_map", "wm"], {
                    description: "Show nearest Warps on map",
                    permissionLevel: Minecraft.CommandPermissionLevel.Any,
                    optionalParameters: [],
                },
                mapCommand
            );

            registerCommandWithAliases(event, ["warp_add", "wa"], {
                    description: "Add a new public Warp",
                    permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors,
                    optionalParameters: [{
                        type: CustomCommandParamType.String,
                        name: "warps:name",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:translation_pattern",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:sign_mode",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:sign_material",
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:icon",
                    }, {
                        type: CustomCommandParamType.Location,
                        name: "warps:location",
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
                    description: "Change sign for a public Warp (optional translation pattern after material)",
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
                    }, {
                        type: CustomCommandParamType.Enum,
                        name: "warps:translation_pattern",
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
            event.itemComponentRegistry.registerCustomComponent(WARP_MENU_ITEM_ID, {
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

            event.itemComponentRegistry.registerCustomComponent(WARP_MAP_ITEM_ID, {
                onUse: (event) => {
                    system.run(() => {
                        const player = event.source && event.source.typeId === "minecraft:player" ? event.source : null;
                        if (!player || player.isSneaking) return;
                        showMainMenuMap(player, {listWarps: false, returnToMainMenuOnCancel: false});
                    });
                }
            });

        });
    }

    Minecraft.world.afterEvents.worldLoad.subscribe(() => {
        system.runTimeout(() => {
            loadWarps();
            cleanupFavoritesStorage();
            Minecraft.world.getAllPlayers().forEach((player) => {
                syncPlayerLocatorFromFavorites(player);
            });
        }, 60);
    });

    Minecraft.world.afterEvents.playerSpawn.subscribe((event) => {
        system.runTimeout(() => {
            const player = event.player;
            if (!player) return;
            syncPlayerLocatorFromFavorites(player);
        }, 20);
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
