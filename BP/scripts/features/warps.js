import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"
import {system, CustomCommandParamType, CustomCommandStatus, SignSide} from "@minecraft/server";


const WarpIcon = (key, category, path) => {
    return {
        name: key,
        path: `textures/icons/${path}`,
        category: category,
        translatedName: `warps:icon.${key}`,
        translatedCategory: `warps:category.${category}`
    };
}

export const Warps = () => {
    ///=================================================================================================================
    // === Constants (module scope) ===
    const WORLD_PROP = "warps:data";
    const COMMAND_WARPS_TP = "warps:warps_tp";
    const COMMAND_WARPS_ADD = "warps:warps_add";
    const COMMAND_WARP_RENAME = "warps:warps_rename";
    const COMMAND_WARP_REMOVE = "warps:warps_remove";
    const ITEM_COMPONENT_ID = "warps:warp_menu";

    let dataLoaded = false;

    const isDataLoaded = () => dataLoaded;

    // Lista dostępnych obrazków dla warps — zorganizowane w kategorie
    const WARP_ICONS = [
        // === LOKACJE SPECJALNE ===
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

        // === ZASOBY === (posortowane od najpospolitszych do najrzadszych)
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

        // Minecraft Villages
        WarpIcon("Plains_Village", "villages", "village/plains_village.png"),
        WarpIcon("Desert_Village", "villages", "village/desert_village.png"),
        WarpIcon("Jungle_Temple", "villages", "village/jungle_temple.png"),
        WarpIcon("Savanna_Village", "villages", "village/savanna_village.png"),
        WarpIcon("Snowy_Village", "villages", "village/snowy_village.png"),
        WarpIcon("Taiga_Village", "villages", "village/taiga_village.png"),

        // Minecraft Places
        WarpIcon("Swamp_Hut", "villages", "village/swamp_hut.png"),
        WarpIcon("Ocean_Monument", "villages", "village/ocean_monument.png"),
        WarpIcon("Trial_Chambers", "villages", "village/trial_chambers.png"),
        WarpIcon("Woodland_Mansion", "villages", "village/woodland_mansion.png"),

        // === DOMY ===
        WarpIcon("Cottage", "houses", "landscapes-23/cottage.png"),
        WarpIcon("Modern_House", "houses", "landscapes-23/modern-house.png"),
        WarpIcon("Ruins_Ancient", "houses", "landscapes-23/ruins-ancient.png"),
        WarpIcon("Landscape_Castle", "houses", "landscapes-23/castle.png"),
        WarpIcon("Antarctic", "houses", "landscapes-23/antarctic.png"),
        WarpIcon("Seascape_Lighthouse", "houses", "landscapes-23/seascape-lighthouse.png"),

        // === MIASTO ===
        WarpIcon("Cityscape", "city", "landscapes-23/cityscape.png"),
        WarpIcon("Cityscape_Futuristic", "city", "landscapes-23/cityscape-futuristic.png"),
        WarpIcon("Industrial_Factory", "city", "landscapes-23/industrial-factory.png"),
        WarpIcon("Construction_Crane", "city", "landscapes-23/construction-crane.png"),
        WarpIcon("Garden_Tree", "city", "landscapes-23/garden-tree.png"),
        WarpIcon("Park", "city", "landscapes-23/park.png"),
        WarpIcon("Amusement_Park", "city", "landscapes-23/amusement-park.png"),
        WarpIcon("Road", "city", "landscapes-23/road.png"),
        WarpIcon("Street", "city", "landscapes-23/street.png"),
        WarpIcon("Bridge_River", "city", "landscapes-23/bridge-river.png"),

        // === KRAJOBRAZY ===
        // Nature
        WarpIcon("Bushes_Bush", "landscapes", "landscapes-23/bushes-bush.png"),
        WarpIcon("Desert", "landscapes", "landscapes-23/desert.png"),
        WarpIcon("Forest", "landscapes", "landscapes-23/forest.png"),
        WarpIcon("Mountains", "landscapes", "landscapes-23/mountains-mountain.png"),
        WarpIcon("Rainforest", "landscapes", "landscapes-23/rainforest.png"),
        WarpIcon("Savannah", "landscapes", "landscapes-23/savannah.png"),

        // Water
        WarpIcon("River", "landscapes", "landscapes-23/river.png"),
        WarpIcon("Waterfall_River", "landscapes", "landscapes-23/waterfall-river.png"),
        WarpIcon("Lake", "landscapes", "landscapes-23/lake.png"),

        // Sea
        WarpIcon("Beach_Sea", "landscapes", "landscapes-23/beach-sea.png"),
        WarpIcon("Sea_Boat", "landscapes", "landscapes-23/sea-boat.png"),
        WarpIcon("Island", "landscapes", "landscapes-23/island.png"),
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

    ///=================================================================================================================
    // === Icon Functions ===

    const getCategories = () => {
        const categories = new Set();
        WARP_ICONS.forEach(icon => {
            if (icon && icon.category) {
                categories.add(icon.category);
            }
        });
        return Array.from(categories);
    }

    const getIconsByCategory = (category) => {
        return WARP_ICONS.filter(icon => icon && icon.category === category);
    }

    const findIconByName = (iconName) => {
        return WARP_ICONS.find(icon => icon && icon.name === iconName);
    }
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
            // Migracja: dodaj owner i visibility do istniejących warpa
            const mapped = warps.map(warp => {
                if (!warp.owner) {
                    warp.owner = ""; // Nieznany właściciel dla starych warpa
                }
                if (!warp.visibility) {
                    warp.visibility = WARP_VISIBILITY.PUBLIC;
                }
                if (warp.facing === undefined || warp.facing === null) {
                    warp.facing = 0;
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

    const saveWarps = (warps, player, soundId, translateKey, translateParams = []) => {
        const json = JSON.stringify(warps);
        Minecraft.world.setDynamicProperty(WORLD_PROP, json);
        player.dimension.playSound(soundId, player.location);

        // Formatuj parametry dla rawtext
        const formattedParams = translateParams.map(param => {
            // Jeśli param jest już obiektem z rawtext, zwróć go
            if (typeof param === 'object' && param.rawtext) {
                return param;
            }
            // Jeśli param jest obiektem z translate lub text, zwróć go bezpośrednio
            if (typeof param === 'object' && (param.translate || param.text)) {
                return param;
            }
            // Jeśli param jest stringiem lub liczbą, opakuj w text
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

    const getValidWarps = () => {
        return loadWarps().filter(warp =>
            warp?.name &&
            warp?.x !== undefined &&
            warp?.y !== undefined &&
            warp?.z !== undefined &&
            warp?.dimension
        );
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
    // === Warp Functions ===
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

    const getWarpIconTexts = (warp) => {
        if (!warp || !warp.icon) {
            return {
                categoryText: {text: "?"},
                iconText: {text: "?"}
            };
        }
        const icon = findIconByName(warp.icon);
        if (!icon) {
            return {
                categoryText: {text: "?"},
                iconText: {text: warp.icon || "?"}
            };
        }
        return {
            categoryText: icon.translatedCategory ? {translate: icon.translatedCategory} : {text: "?"},
            iconText: icon.translatedName ? {translate: icon.translatedName} : {text: warp.icon || "?"}
        };
    }

    const getWarpDetails = (warp, player, translationKey) => {
        let distanceText = {text: "?"};
        if (player) {
            const playerLocation = player.location;
            if (warp.dimension === getPlayerDimension(player)) {
                const distance = calculateDistance(
                    playerLocation.x, playerLocation.y, playerLocation.z,
                    warp.x, warp.y, warp.z
                );

                const distanceTranslationKeySuffix = (distance === 1)
                    ? "1"
                    : (
                        (1 < distance && distance < 5)
                            ? "2"
                            : "5"
                    );

                distanceText = {
                    translate: `warps:distance.value_${distanceTranslationKeySuffix}`,
                    with: {rawtext: [{text: Math.round(distance).toString()}]}
                }
            }

        }
        const visibility = (warp.visibility || WARP_VISIBILITY.PUBLIC);
        const {categoryText, iconText} = getWarpIconTexts(warp);

        return {
            rawtext: [{
                translate: translationKey,
                with: {
                    rawtext: [
                        {text: warp.name},
                        {text: `${warp.x}, ${warp.y}, ${warp.z}`},
                        {translate: `warps:dimension.${warp.dimension}`},
                        distanceText,
                        {text: warp.owner || "?"},
                        {translate: `warps:visibility.state.${visibility}.label`},
                        (visibility)
                            ? {translate: `warps:visibility.state.${visibility}.symbol`}
                            : {text: ""},
                        categoryText,
                        iconText
                    ]
                }
            }]
        };
    }

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
    // === Standing Sign Functions ===

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
            if (existingBlock && existingBlock.typeId.includes("standing_sign")) {
                warpDimension.runCommand(`setblock ${signLocation.x} ${signLocation.y} ${signLocation.z} minecraft:air replace`);
            }
        } catch (error) {
            console.error(`[WARP] Error removing sign for warp ${warp.name}: ${error}`);
        }
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

            const existingBlock = warpDimension.getBlock(signLocation);
            const isCorrectSign = existingBlock && existingBlock.typeId.includes("standing_sign");
            const facing = warp.facing !== undefined && warp.facing !== null ? warp.facing : 0;
            const groundSignDirection = facing * 4;

            if (!isCorrectSign) {
                const cmd = `setblock ${signLocation.x} ${signLocation.y} ${signLocation.z} standing_sign ${groundSignDirection} replace`;
                console.info(cmd)
                warpDimension.runCommand(cmd);
            }

            [1, 2, 3].forEach((delay, index) => {
                system.runTimeout(() => {
                    try {
                        const placedBlock = warpDimension.getBlock(signLocation);
                        if (placedBlock && placedBlock.typeId.includes("standing_sign")) {
                            const signComponent = placedBlock.getComponent("minecraft:sign");
                            if (signComponent) {
                                const text = getWarpDetails(warp, null, "warps:standing_sign_text");
                                signComponent.setText(text, SignSide.Front);
                                signComponent.setText(text, SignSide.Back);
                                signComponent.setWaxed(true);
                            }
                        }
                    } catch (err) {
                        if (index === 2) {
                            console.error(`[WARP] Error setting sign properties (attempt ${index + 1}) for ${warp.name}: ${err}`);
                        }
                    }
                }, delay);
            });
        } catch (error) {
            console.error(`[WARP] Error updating sign for warp ${warp.name}: ${error}`);
        }
    }

    const updateWarpSigns = () => {
        if (!isDataLoaded()) return;

        const players = Minecraft.world.getPlayers();
        if (players.length === 0) return;

        const warps = getValidWarps();
        const maxDistance = 128;
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

    const getCategoriesWithWarps = (warps) => {
        const allCategories = getCategories();
        return allCategories.filter(category => {
            return warps.some(warp => {
                const icon = findIconByName(warp.icon);
                return icon && icon.category === category;
            });
        });
    }

    const filterWarpsByCategory = (warps, category) => {
        if (!category) return warps;
        return warps.filter(warp => {
            const icon = findIconByName(warp.icon);
            return icon && icon.category === category;
        });
    }


    const canPlayerSeeWarp = (player, warp) => {
        if (!warp.visibility) return true; // Dla starych warpa bez visibility
        if (warp.visibility === WARP_VISIBILITY.PUBLIC || warp.visibility === WARP_VISIBILITY.PROTECTED) {
            return true;
        }
        if (warp.visibility === WARP_VISIBILITY.PRIVATE) {
            return warp.owner === player.name;
        }
        return true;
    }

    const canPlayerEditWarp = (player, warp) => {
        if (!warp.owner) return true; // Dla starych warpa bez owner
        if (warp.visibility === WARP_VISIBILITY.PUBLIC) {
            return true; // Publiczne mogą edytować wszyscy
        }
        return warp.owner === player.name; // Tylko właściciel może edytować protected i private
    }

    const filterWarpsByVisibility = (warps, player) => {
        return warps.filter(warp => canPlayerSeeWarp(player, warp));
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
            return player.sendMessage({
                translate: "warps:warp.not_found",
                with: [warpName]
            });
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
    // === WARP DETAILS ===
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

        // Opcja: Wszystkie warpy
        filterForm.button({
            rawtext: [{translate: "warps:menu.filter_all"}]
        });

        filterForm.label({rawtext: [{translate: "warps:menu.filter_select_category"}]});

        // Filtruj kategorie — pokazuj tylko te, które mają warpy
        const categoriesWithWarps = getCategoriesWithWarps(warps);

        // Opcje dla każdej kategorii z warpsami
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
                // Wszystkie warpy
                filteredWarps = warps;
            } else {
                // Wybrana kategoria
                const categoryIndex = filterRes.selection - 1;
                if (categoryIndex >= 0 && categoryIndex < categoriesWithWarps.length) {
                    selectedCategory = categoriesWithWarps[categoryIndex];
                    filteredWarps = filterWarpsByCategory(warps, selectedCategory);
                }
            }

            // Filtruj ponownie według visibility (na wypadek gdyby kategoria zawierała niewidoczne warpy)
            filteredWarps = filterWarpsByVisibility(filteredWarps, player);

            if (filteredWarps.length === 0) {
                return player.sendMessage({translate: "warps:menu.no_warps_in_category"});
            }

            // Domyślne sortowanie: distance dla teleport, alphabetical dla management
            const defaultSortBy = mode === WARP_MENU.TELEPORT ? SORT_BY.DISTANCE : SORT_BY.ALPHABETICAL;
            showWarpsListMenuWithOptions(player, filteredWarps, defaultSortBy, selectedCategory, mode);
        });
    }

    const showWarpsListMenuWithOptions = (player, warps, sortBy, selectedCategory = null, mode = WARP_MENU.TELEPORT) => {
        // Tytuł formularza
        const actionFormTitleKey = (mode === WARP_MENU.TELEPORT)
            ? "warps:teleport_menu.title"
            : "warps:manage_menu.title";

        // Przycisk do zmiany sortowania na pierwszej pozycji
        const sortButtonTextKey = sortBy === SORT_BY.DISTANCE
            ? "warps:menu.sort_change_to_alphabetical"
            : "warps:menu.sort_change_to_distance";
        const sortLabelTextKey = sortBy === SORT_BY.DISTANCE
            ? "warps:menu.sorting_by_distance"
            : "warps:menu.sorting_by_alphabetical";

        const actionForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: actionFormTitleKey}]})
            .body("")
            .button({rawtext: [{translate: sortButtonTextKey}]})
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

        // Filtruj warpy według visibility
        const visibleWarps = filterWarpsByVisibility(warps, player);
        const sortedWarps = sortWarps(visibleWarps, sortBy, player);

        sortedWarps.forEach(warp => {
            try {
                const buttonTranslationKey = sortBy === SORT_BY.DISTANCE
                    ? "warps:button_format.long"
                    : "warps:button_format.short";

                const icon = findIconByName(warp.icon);
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

            // Jeśli wybrano przycisk zmiany sortowania (indeks 0)
            if (res.selection === 0) {
                const newSortBy = sortBy === SORT_BY.DISTANCE ? SORT_BY.ALPHABETICAL : SORT_BY.DISTANCE;
                showWarpsListMenuWithOptions(player, warps, newSortBy, selectedCategory, mode);
                return;
            }

            // Jeśli wybrano warp (indeks > 0, ale trzeba odjąć 1 bo pierwszy to przycisk sortowania)
            const warpIndex = res.selection - 1;
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

    // Wrapper functions for compatibility
    const showWarpDetailsMenu = (player, warp) => {
        const icon = findIconByName(warp.icon);
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
                getWarpDetails(warp, player, "warps:warp_details.body")
            );
        const canEdit = canPlayerEditWarp(player, warp);
        let buttonIndex = 1;

        if (canEdit) {
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_name"}]
            });
            buttonIndex++;
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.edit_icon"}]
            });
            buttonIndex++;
            if (warp.visibility !== WARP_VISIBILITY.PUBLIC) {
                optionsForm.button({
                    rawtext: [{translate: "warps:warp_details.options.change_visibility"}]
                });
                buttonIndex++;
            }
            optionsForm.button({
                rawtext: [{translate: "warps:warp_details.options.delete"}]
            });
            buttonIndex++;
        }

        optionsForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            if (res.selection === 0) {
                // Teleportuj
                teleportToWarp(player, warp);
                return;
            }

            if (!canEdit) {
                player.sendMessage({translate: "warps:error.no_permission"});
                return;
            }

            let actionIndex = res.selection - 1;
            const hasVisibilityButton = warp.visibility !== WARP_VISIBILITY.PUBLIC;

            switch (actionIndex) {
                case 0: // Zmień nazwę
                    editWarpNameForm(player, warp);
                    break;
                case 1: // Zmień ikonę
                    editWarpIconFormStep1(player, warp);
                    break;
                case 2: // Zmień visibility lub Usuń
                    if (hasVisibilityButton) {
                        editWarpVisibilityForm(player, warp);
                    } else {
                        removeWarpItemForm(player, warp);
                    }
                    break;
                case 3: // Usuń (gdy visibility button jest widoczny)
                    removeWarpItemForm(player, warp);
                    break;
            }
        });
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
        // Jeśli kategoria i ikona są już wybrane (np. po błędzie), pominij krok 1 i 2
        if (category && iconName) {
            const categoryIcons = getIconsByCategory(category);
            const selectedIcon = categoryIcons.find(icon => icon.name === iconName);
            if (selectedIcon) {
                addWarpItemFormStep3(player, warpName, selectedIcon, targetLocation, warpDimensionId);
                return;
            }
        }

        // Krok 1/3: Wybór kategorii
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
        // Krok 2/3: Wybór ikony z wybranej kategorii
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
        // Krok 3/3: Nazwa, współrzędne i visibility
        new MinecraftUi.ModalFormData()
            .title({rawtext: [{translate: "warps:add.step3.title"}]})
            .label({rawtext: [{translate: "warps:add.field.category.label"}]})
            .label({
                rawtext: [{
                    translate: "§l%%s§r", with: {
                        rawtext: [{translate: icon.translatedCategory}]
                    }
                }]
            })
            .label({rawtext: [{translate: "warps:add.field.icon.label"}]})
            .label({
                rawtext: [{
                    translate: "§l%%s§r", with: {
                        rawtext: [{translate: icon.translatedName}]
                    }
                }]
            })
            .textField({rawtext: [{translate: "warps:add.field.name.label"}]}, {rawtext: [{translate: "warps:add.field.name.placeholder"}]}, {defaultValue: warpName})
            .textField({rawtext: [{translate: "warps:add.field.x.label"}]}, {rawtext: [{translate: "warps:add.field.x.placeholder"}]}, {defaultValue: targetLocation.x.toString()})
            .textField({rawtext: [{translate: "warps:add.field.y.label"}]}, {rawtext: [{translate: "warps:add.field.y.placeholder"}]}, {defaultValue: targetLocation.y.toString()})
            .textField({rawtext: [{translate: "warps:add.field.z.label"}]}, {rawtext: [{translate: "warps:add.field.z.placeholder"}]}, {defaultValue: targetLocation.z.toString()})
            .dropdown(
                {rawtext: [{translate: "warps:add.field.visibility.label"}]},
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
            const visibilityIndex = 8

            if (!res.formValues || !res.formValues[warpNameIndex] || !res.formValues[targetLocationXIndex] || !res.formValues[targetLocationYIndex] || !res.formValues[targetLocationZIndex] || res.formValues[visibilityIndex] === undefined) {
                player.sendMessage({translate: "warps:add.fill_required"});
                // Ponownie pokaż formularz z wypełnionymi danymi
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
            const selectedVisibility = getVisibilityByIndex(res.formValues[visibilityIndex]);
            addWarpItemSave(player, warpName, icon, finalLocation, warpDimensionId, selectedVisibility);
        });
    }

    const addWarpItemSave = (player, warpName, icon, targetLocation, warpDimensionId, visibility = WARP_VISIBILITY.PROTECTED) => {
        // Walidacja ikony
        if (!icon || !icon.name) {
            player.sendMessage({translate: "warps:add.invalid_icon"});
            addWarpItemFormStep1(player, {warpName, targetLocation, warpDimensionId});
            return;
        }

        // Walidacja nazwy
        if (!warpName || warpName.trim().length === 0) {
            player.sendMessage({translate: "warps:add.fill_required"});
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
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 3/3, pomijając wybór kategorii i ikony)
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        // Walidacja współrzędnych (rozsądne limity)
        // Y może być od -64 do 320 w Bedrock Edition (od wersji 1.18+)
        if (Math.abs(targetLocation.x) > 30000000 || targetLocation.y < -64 || targetLocation.y > 320 || Math.abs(targetLocation.z) > 30000000) {
            player.sendMessage({translate: "warps:add.coords_out_of_range"});
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        const warps = loadWarps();

        targetLocation = roundLocation(targetLocation);

        // Check if warp with same name already exists (tylko jeśli nie edytujemy lub zmieniamy nazwę)
        if (warps.some(w => w.name === warpName)) {
            player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [warpName]
            });
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 3/3, pomijając wybór kategorii i ikony)
            addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        const playerLoc = player.location;
        const dx = targetLocation.x - playerLoc.x;
        const dz = targetLocation.z - playerLoc.z;
        let facing;
        if (Math.abs(dx) > Math.abs(dz)) {
            facing = dx > 0 ? 1 : 3;
        } else {
            facing = dz > 0 ? 2 : 0;
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
            facing: facing
        };

        warps.push(newWarp);
        saveWarps(warps, player, "beacon.activate", "warps:add.success", [
            warpName,
            targetLocation.x.toString(), targetLocation.y.toString(), targetLocation.z.toString()
        ]);

        player.dimension.runCommand(`summon fireworks_rocket ${targetLocation.x} ${targetLocation.y} ${targetLocation.z}`);
        updateWarpSigns();
    }

    ///=================================================================================================================
    // === WARP EDIT ===

    const editWarpNameForm = (player, warp) => {
        system.run(() => {
            new MinecraftUi.ModalFormData()
                .title({
                    rawtext: [{
                        translate: "warps:warp_details.edit_name.title",
                        with: {rawtext: [{text: warp.name}]}
                    }]
                })
                .textField(
                    {rawtext: [{translate: "warps:add.field.new_name.label"}]},
                    {rawtext: [{translate: "warps:add.field.name.placeholder"}]},
                    {defaultValue: warp.name}
                )
                .submitButton({rawtext: [{translate: "warps:add.submit"}]})
                .show(player).then((res) => {
                if (res.canceled) {
                    showWarpDetailsMenu(player, warp);
                    return;
                }

                if (!res.formValues || res.formValues.length === 0) {
                    player.sendMessage({translate: "warps:add.fill_required"});
                    editWarpNameForm(player, warp);
                    return;
                }

                const newWarpName = res.formValues[0]?.toString().trim();

                editWarpNameSave(player, warp, newWarpName);
            });
        });
    }

    const editWarpNameSave = (player, warp, newWarpName) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        if (!newWarpName || newWarpName.length === 0) {
            player.sendMessage({translate: "warps:add.fill_required"});
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
            player.sendMessage({translate: "warps:warp_details.edit_name.not_found"});
            return;
        }

        // Sprawdź czy nowa nazwa nie jest już zajęta (jeśli się zmieniła)
        if (newWarpName !== warp.name && warps.some(w => w.name === newWarpName)) {
            player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [newWarpName]
            });
            editWarpNameForm(player, warp);
            return;
        }

        const oldName = warp.name;
        warps[warpIndex].name = newWarpName;
        saveWarps(warps, player, "beacon.power", "warps:warp_details.edit_name.success", [
            oldName,
            newWarpName,
        ]);
        updateWarpSign(warps[warpIndex]);
        showWarpDetailsMenu(player, warps[warpIndex]);
    }

    const editWarpVisibilityForm = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        // Nie można zmieniać publicznych
        if (warp.visibility === WARP_VISIBILITY.PUBLIC) {
            player.sendMessage({translate: "warps:visibility.cannot_change_public"});
            showWarpDetailsMenu(player, warp);
            return;
        }

        system.run(() => {
            const availableOptions = [];

            if (warp.visibility === WARP_VISIBILITY.PRIVATE) {
                // Prywatny może stać się zabezpieczony lub publiczny
                availableOptions.push({rawtext: [{translate: "warps:visibility.state.protected.label"}]});
                availableOptions.push({rawtext: [{translate: "warps:visibility.state.public.label"}]});
            } else if (warp.visibility === WARP_VISIBILITY.PROTECTED) {
                // Zabezpieczony może stać się prywatny lub publiczny
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

                // Ostrzeżenie przy przejściu na publiczny
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
            player.sendMessage({translate: "warps:warp_details.edit_name.not_found"});
            return;
        }

        warps[warpIndex].visibility = newVisibility;
        saveWarps(warps, player, "beacon.power", "warps:warp_details.change_visibility.success", [
            warp.name,
            {translate: `warps:visibility.state.${warp.visibility}.label`},
            {translate: `warps:visibility.${newVisibility.toString()}.label`}
        ]);
        showWarpDetailsMenu(player, warps[warpIndex]);
    }

    const editWarpIconFormStep1 = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
            return;
        }

        // Krok 1: Wybór kategorii
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
        // Krok 2: Wybór ikony z wybranej kategorii
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

            // Sprawdź uprawnienia przed zapisem
            if (!canPlayerEditWarp(player, warp)) {
                player.sendMessage({translate: "warps:error.no_permission"});
                return;
            }

            // Zapisz zmianę ikony
            const warps = loadWarps();
            const warpIndex = warps.findIndex(w => w.name === warp.name);

            if (warpIndex === -1) {
                player.sendMessage({translate: "warps:warp_details.edit_name.not_found"});
                return;
            }

            warps[warpIndex].icon = selectedIcon.name;
            saveWarps(warps, player, "beacon.power", "warps:warp_details.edit_icon.success", [
                {text: warp.name},
                {translate: selectedIcon.translatedName}
            ]);
            showWarpDetailsMenu(player, warps[warpIndex]);
        });
    }

    ///=================================================================================================================
    // === Remove Functions ===

    const removeWarpItemForm = (player, warp) => {
        if (!canPlayerEditWarp(player, warp)) {
            player.sendMessage({translate: "warps:error.no_permission"});
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
                // Sprawdź uprawnienia przed usunięciem
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
                saveWarps(updatedWarps, player, "beacon.deactivate", "warps:warp_details.remove.success", [
                    warp.name,
                ]);
                removeWarpSign(warp);
            } else {
                showWarpDetailsMenu(player, warp);
            }
        })
    }

    ///=================================================================================================================
    // === Main Menu ===
    const mainMenu = (player) => {
        const menuForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:main_menu.title"}]})
            .body({rawtext: [{translate: "warps:main_menu.body"}]});

        menuForm.button({
            rawtext: [{translate: "warps:main_menu.teleport"}]
        });
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.manage"}]
        });
        menuForm.button({
            rawtext: [{translate: "warps:main_menu.add"}]
        });

        menuForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            switch (res.selection) {
                case 0: // Teleportuj
                    showCategoriesListMenu(player, WARP_MENU.TELEPORT);
                    break;
                case 1: // Zarządzaj
                    showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                    break;
                case 2: // Dodaj
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

            event.customCommandRegistry.registerEnum("warps:icon", WARP_ICONS.filter(icon => icon && icon.name).map(icon => icon.name))

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
            )

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
                    }],
                },
                (origin, warpName = "", iconName = "", location = null) => {
                    system.run(() => {
                        const player = getPlayer(origin)
                        if (!player) return;

                        const targetLocation = roundLocation(location || player.location);
                        const warpDimensionId = getPlayerDimension(player);
                        if (warpName && iconName && targetLocation) {
                            const icon = findIconByName(iconName);
                            addWarpItemSave(player, warpName, icon, targetLocation, warpDimensionId);
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
            )

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
                                    translate: "warps:warp.not_found",
                                    with: [oldWarpName]
                                });
                            }
                            editWarpNameSave(player, warp, newWarpName);
                        } else {
                            showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                        }
                    })
                }
            )

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
                                    translate: "warps:warp.not_found",
                                    with: [warpName]
                                });
                            }
                            removeWarpItemForm(player, warp);
                        } else {
                            showCategoriesListMenu(player, WARP_MENU.MANAGEMENT);
                        }
                    })
                }
            )

            ///=================================================================================================================
            // === Item Component Registration ===
            event.itemComponentRegistry.registerCustomComponent(ITEM_COMPONENT_ID, {
                // Shift + right click na blok = dodawanie warpa
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
                // Right click = dodawanie warpa
                onUse: (event) => {
                    system.run(() => {
                        const player = event.source && event.source.typeId === "minecraft:player" ? event.source : null;
                        if (!player || player.isSneaking) return;
                        mainMenu(player);
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
            
            // Sprawdź czy to standing_sign
            if (!block.typeId.includes("standing_sign")) return;
            
            // Pobierz lokalizację bloku
            const blockLoc = block.location;
            const dimensionId = getPlayerDimension(player);
            
            // Znajdź warp na podstawie lokalizacji
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
