import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"
import {system, CustomCommandParamType, CustomCommandStatus} from "@minecraft/server";


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

    // Lista dostępnych obrazków dla warps — zorganizowane w kategorie, posortowane alfabetycznie
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
        WarpIcon("Desert_Village", "places", "village/desert_village.png"),
        WarpIcon("Jungle_Temple", "places", "village/jungle_temple.png"),
        WarpIcon("Ocean_Monument", "places", "village/ocean_monument.png"),
        WarpIcon("Plains_Village", "places", "village/plains_village.png"),
        WarpIcon("Savanna_Village", "places", "village/savanna_village.png"),
        WarpIcon("Snowy_Village", "places", "village/snowy_village.png"),
        WarpIcon("Swamp_Hut", "places", "village/swamp_hut.png"),
        WarpIcon("Taiga_Village", "places", "village/taiga_village.png"),
        WarpIcon("Trial_Chambers", "places", "village/trial_chambers.png"),
        WarpIcon("Woodland_Mansion", "places", "village/woodland_mansion.png"),

        // === KRAJOBRAZY ===
        WarpIcon("Cottage", "landscapes", "landscapes-23/cottage.png"),
        WarpIcon("Modern_House", "landscapes", "landscapes-23/modern-house.png"),
        WarpIcon("Antarctic", "landscapes", "landscapes-23/antarctic.png"),
        WarpIcon("Cityscape", "landscapes", "landscapes-23/cityscape.png"),
        WarpIcon("Cityscape_Futuristic", "landscapes", "landscapes-23/cityscape-futuristic.png"),
        WarpIcon("Industrial_Factory", "landscapes", "landscapes-23/industrial-factory.png"),
        WarpIcon("Construction_Crane", "landscapes", "landscapes-23/construction-crane.png"),
        WarpIcon("Road", "landscapes", "landscapes-23/road.png"),
        WarpIcon("Street", "landscapes", "landscapes-23/street.png"),
        WarpIcon("Garden_Tree", "landscapes", "landscapes-23/garden-tree.png"),
        WarpIcon("Park", "landscapes", "landscapes-23/park.png"),
        WarpIcon("Amusement_Park", "landscapes", "landscapes-23/amusement-park.png"),

        WarpIcon("Mountains", "landscapes", "landscapes-23/mountains-mountain.png"),
        WarpIcon("Ruins_Ancient", "landscapes", "landscapes-23/ruins-ancient.png"),
        WarpIcon("Landscape_Castle", "landscapes", "landscapes-23/castle.png"),

        WarpIcon("Forest", "landscapes", "landscapes-23/forest.png"),
        WarpIcon("Desert", "landscapes", "landscapes-23/desert.png"),
        WarpIcon("Savannah", "landscapes", "landscapes-23/savannah.png"),
        WarpIcon("Lake", "landscapes", "landscapes-23/lake.png"),
        WarpIcon("River", "landscapes", "landscapes-23/river.png"),
        WarpIcon("Bridge_River", "landscapes", "landscapes-23/bridge-river.png"),
        WarpIcon("Waterfall_River", "landscapes", "landscapes-23/waterfall-river.png"),

        WarpIcon("Beach_Sea", "landscapes", "landscapes-23/beach-sea.png"),
        WarpIcon("Seascape_Lighthouse", "landscapes", "landscapes-23/seascape-lighthouse.png"),
        WarpIcon("Sea_Boat", "landscapes", "landscapes-23/sea-boat.png"),
        WarpIcon("Island", "landscapes", "landscapes-23/island.png"),
    ]

    const WARP_MENU = Object.freeze({
        TELEPORT: "teleport",
        MANAGEMENT: "management"
    });

    const useLock = new Map(); // Map<Player.id, boolean>

    ///=================================================================================================================
    // === Data Management Functions ===
    const loadWarps = () => {
        const saved = Minecraft.world.getDynamicProperty(WORLD_PROP)?.toString();
        if (!saved) {
            return [];
        }
        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    }

    const saveWarps = (warps) => {
        const json = JSON.stringify(warps);
        Minecraft.world.setDynamicProperty(WORLD_PROP, json);
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

    const getWarpDimension = (dimensionId) => {
        return Minecraft.world.getDimension(`minecraft:${dimensionId}`);
    }

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
    // === Helper Functions ===
    const getPlayer = (origin) => {
        let player = null;
        if (origin.sourceType === Minecraft.CustomCommandSource.Entity && origin.sourceEntity.typeId === "minecraft:player") {
            player = origin.sourceEntity;
        } else if (origin.sourceType === Minecraft.CustomCommandSource.NPCDialogue && origin.initiator.typeId === "minecraft:player") {
            player = origin.initiator;
        }
        return player;
    }

    const getPlayerDimension = (player) => {
        return player.dimension.id.replace("minecraft:", "")
    }

    const getDimensionTranslationKey = (dimension) => {
        return `warps:dimension.${dimension}`;
    }

    const calculateDistance = (x1, y1, z1, x2, y2, z2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    const sortWarps = (warps, sortBy, player) => {
        const sorted = [...warps];
        if (sortBy === 'distance') {
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
        } else {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
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

    const getWarpIconTexts = (warp) => {
        const icon = findIconByName(warp.icon);
        return {
            categoryText: icon ? {translate: icon.translatedCategory} : {text: "?"},
            iconText: icon ? {translate: icon.translatedName} : {text: warp.icon || "?"}
        };
    }


    const getWarpByName = (warpName) => {
        const warps = getValidWarps();
        const warp = warps.find(w => w.name.toLowerCase() === warpName.toLowerCase());

        if (!warp) {
            throw new Error({
                translate: "warps:teleport.not_found",
                with: [warpName]
            });
        }
    }

    ///=================================================================================================================
    // === Teleport Functions ===
    const teleportToWarpByName = (player, warpName) => {
        if (!player || !warpName) {
            return;
        }

        const warps = getValidWarps();
        const warp = warps.find(w => w.name.toLowerCase() === warpName.toLowerCase());

        if (!warp) {
            return player.sendMessage({
                translate: "warps:teleport.not_found",
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
        const warps = getValidWarps();

        if (warps.length === 0) {
            return player.sendMessage({translate: "warps:menu.no_warps"});
        }

        const filterFormTitle = mode === WARP_MENU.TELEPORT
            ? {rawtext: [{translate: "warps:teleport_menu.title"}]}
            : {rawtext: [{translate: "warps:manage_menu.title"}]};

        const filterForm = new MinecraftUi.ActionFormData()
            .title(filterFormTitle);

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

            if (filteredWarps.length === 0) {
                return player.sendMessage({translate: "warps:menu.no_warps_in_category"});
            }

            // Domyślne sortowanie: distance dla teleport, alphabetical dla management
            const defaultSortBy = mode === WARP_MENU.TELEPORT ? 'distance' : 'alphabetical';
            showWarpsListMenuWithOptions(player, filteredWarps, defaultSortBy, selectedCategory, mode);
        });
    }

    const showWarpsListMenuWithOptions = (player, warps, sortBy, selectedCategory = null, mode = WARP_MENU.TELEPORT) => {
        // Tytuł formularza
        let actionFormTitle;
        if (mode === WARP_MENU.TELEPORT) {
            actionFormTitle = selectedCategory
                ? {
                    rawtext: [{
                        translate: "warps:teleport_menu.title_cat",
                        with: {
                            rawtext: [{translate: `warps:category.${selectedCategory}`}]
                        }
                    }]
                }
                : {
                    rawtext: [{translate: "warps:teleport_menu.title_all"}]
                };
        } else {
            actionFormTitle = selectedCategory
                ? {
                    rawtext: [{
                        translate: "warps:manage_menu.title_cat",
                        with: {
                            rawtext: [{translate: `warps:category.${selectedCategory}`}]
                        }
                    }]
                }
                : {
                    rawtext: [{translate: "warps:manage_menu.title_all"}]
                };
        }

        const actionForm = new MinecraftUi.ActionFormData()
            .title(actionFormTitle);

        // Przycisk do zmiany sortowania na pierwszej pozycji
        const sortButtonText = sortBy === 'distance'
            ? {rawtext: [{translate: "warps:menu.sort_change_to_alphabetical"}]}
            : {rawtext: [{translate: "warps:menu.sort_change_to_distance"}]};

        actionForm.button(sortButtonText);

        // Label tylko dla teleport
        if (mode === WARP_MENU.TELEPORT) {
            actionForm.label({rawtext: [{translate: "warps:menu.select"}]});
        }

        const sortedWarps = sortWarps(warps, sortBy, player);
        const playerLocation = player.location;
        const playerDimension = getPlayerDimension(player);

        sortedWarps.forEach(warp => {
            const icon = findIconByName(warp.icon);
            const iconPath = icon ? icon.path : "";

            const buttonTranslationKey = sortBy === 'distance'
                ? "warps:button_format.long"
                : "warps:button_format.short";

            // Format z dystansem dla teleport
            let distance = 0;
            const warpSameDimension = warp.dimension === playerDimension;
            if (warpSameDimension) {
                distance = calculateDistance(
                    playerLocation.x, playerLocation.y, playerLocation.z,
                    warp.x, warp.y, warp.z
                );
            }

            const distanceText = warpSameDimension
                ? Math.round(distance).toString()
                : "?";

            actionForm.button({
                rawtext: [{
                    translate: buttonTranslationKey,
                    with: {
                        rawtext: [
                            {text: warp.name},
                            {text: warp.x.toString()},
                            {text: warp.y.toString()},
                            {text: warp.z.toString()},
                            {translate: getDimensionTranslationKey(warp.dimension)},
                            {text: distanceText}
                        ]
                    }
                }]
            }, iconPath);
        });

        actionForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            // Jeśli wybrano przycisk zmiany sortowania (indeks 0)
            if (res.selection === 0) {
                const newSortBy = sortBy === 'distance' ? 'alphabetical' : 'distance';
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
        const {categoryText, iconText} = getWarpIconTexts(warp);

        const optionsForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body({
                rawtext: [{
                    translate: "warps:warp_details.body",
                    with: {
                        rawtext: [
                            {text: warp.name},
                            {text: warp.x.toString()},
                            {text: warp.y.toString()},
                            {text: warp.z.toString()},
                            {translate: getDimensionTranslationKey(warp.dimension)},
                            categoryText,
                            iconText
                        ]
                    }
                }]
            });

        optionsForm.button({
            rawtext: [{translate: "warps:warp_details.options.teleport"}]
        });
        optionsForm.button({
            rawtext: [{translate: "warps:warp_details.options.edit_name"}]
        });
        optionsForm.button({
            rawtext: [{translate: "warps:warp_details.options.edit_icon"}]
        });
        optionsForm.button({
            rawtext: [{translate: "warps:warp_details.options.delete"}]
        });

        optionsForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            switch (res.selection) {
                case 0: // Teleportuj
                    teleportToWarp(player, warp);
                    break;
                case 1: // Zmień nazwę
                    editWarpNameForm(player, warp);
                    break;
                case 2: // Zmień ikonę
                    editWarpIconFormStep1(player, warp);
                    break;
                case 3: // Usuń
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

    const addWarpItemFormStep3 = (player, warpName, icon, targetLocation, warpDimensionId) => {
        // Krok 3/3: Nazwa i współrzędne
        new MinecraftUi.ModalFormData()
            .title({rawtext: [{translate: "warps:add.step3.title"}]})
            .label({rawtext: [{translate: "warps:add.field.category.label"}]})
            .label({
                rawtext: [{
                    translate: "warps:add.field.category.value", with: {
                        rawtext: [
                            {translate: icon.translatedCategory},
                            {translate: icon.translatedName}
                        ]
                    }
                }]
            })
            .textField({rawtext: [{translate: "warps:add.field.name.label"}]}, {rawtext: [{translate: "warps:add.field.name.placeholder"}]}, {defaultValue: warpName})
            .textField({rawtext: [{translate: "warps:add.field.x.label"}]}, {rawtext: [{translate: "warps:add.field.x.placeholder"}]}, {defaultValue: targetLocation.x.toString()})
            .textField({rawtext: [{translate: "warps:add.field.y.label"}]}, {rawtext: [{translate: "warps:add.field.y.placeholder"}]}, {defaultValue: targetLocation.y.toString()})
            .textField({rawtext: [{translate: "warps:add.field.z.label"}]}, {rawtext: [{translate: "warps:add.field.z.placeholder"}]}, {defaultValue: targetLocation.z.toString()})
            .submitButton({rawtext: [{translate: "warps:add.submit"}]})
            .show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            const warpNameIndex = 2;
            const targetLocationXIndex = 3
            const targetLocationYIndex = 4
            const targetLocationZIndex = 5

            // Indeksy formValues: [0]=name, [1]=x, [2]=y, [3]=z
            if (!res.formValues[warpNameIndex] || !res.formValues[targetLocationXIndex] || !res.formValues[targetLocationYIndex] || !res.formValues[targetLocationZIndex]) {
                player.sendMessage({translate: "warps:add.fill_required"});
                // Ponownie pokaż formularz z wypełnionymi danymi
                addWarpItemFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
                return;
            }

            warpName = res.formValues[warpNameIndex].replace('"', "'");
            targetLocation.x = parseFloat(res.formValues[targetLocationXIndex].toString());
            targetLocation.y = parseFloat(res.formValues[targetLocationYIndex].toString());
            targetLocation.z = parseFloat(res.formValues[targetLocationZIndex].toString());
            addWarpItemSave(player, warpName, icon, targetLocation, warpDimensionId);
        });
    }

    const addWarpItemSave = (player, warpName, icon, targetLocation, warpDimensionId) => {
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

        targetLocation.x = Math.round(targetLocation.x);
        targetLocation.y = Math.round(targetLocation.y);
        targetLocation.z = Math.round(targetLocation.z);

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

        const newWarp = {
            name: warpName,
            x: targetLocation.x,
            y: targetLocation.y,
            z: targetLocation.z,
            dimension: warpDimensionId,
            icon: icon.name
        };

        warps.push(newWarp);
        saveWarps(warps);

        player.dimension.playSound("beacon.activate", player.location);
        player.dimension.runCommand(`particle minecraft:endrod ${targetLocation.x} ${targetLocation.y} ${targetLocation.z}`);
        player.sendMessage({
            translate: "warps:add.success",
            with: [warpName, targetLocation.x.toString(), targetLocation.y.toString(), targetLocation.z.toString()]
        });
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
        saveWarps(warps);

        player.dimension.playSound("beacon.activate", player.location);
        player.sendMessage({
            translate: "warps:warp_details.edit_name.success",
            with: [oldName, newWarpName]
        });
    }

    const editWarpIconFormStep1 = (player, warp) => {
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
            .body({rawtext: [{translate: "warps:warp_details.edit_icon.step2.body"}]});

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

            // Zapisz zmianę ikony
            const warps = loadWarps();
            const warpIndex = warps.findIndex(w => w.name === warp.name);

            if (warpIndex === -1) {
                player.sendMessage({translate: "warps:warp_details.edit_name.not_found"});
                return;
            }

            warps[warpIndex].icon = selectedIcon.name;
            saveWarps(warps);

            player.dimension.playSound("beacon.activate", player.location);
            player.sendMessage({
                translate: "warps:warp_details.edit_icon.success",
                with: {
                    rawtext: [
                        {text: warp.name},
                        {translate: selectedIcon.translatedName}
                    ]
                }
            });
        });
    }

    ///=================================================================================================================
    // === Remove Functions ===

    const removeWarpItemForm = (player, warp) => {
        const {categoryText, iconText} = getWarpIconTexts(warp);

        new MinecraftUi.MessageFormData()
            .title({
                rawtext: [{
                    translate: "warps:warp_details.remove_confirm.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body({
                rawtext: [{
                    translate: "warps:warp_details.remove_confirm.body",
                    with: {
                        rawtext: [
                            {text: warp.name},
                            {text: warp.x.toString()},
                            {text: warp.y.toString()},
                            {text: warp.z.toString()},
                            {translate: getDimensionTranslationKey(warp.dimension)},
                            categoryText,
                            iconText
                        ]
                    }
                }]
            })
            .button1({rawtext: [{translate: "warps:warp_details.remove_confirm.yes"}]})
            .button2({rawtext: [{translate: "warps:warp_details.remove_confirm.no"}]})
            .show(player).then((res) => {
            if (res.selection === 0) {
                const allWarps = loadWarps();
                const updatedWarps = allWarps.filter(w =>
                    !(w.name === warp.name &&
                        w.x === warp.x &&
                        w.y === warp.y &&
                        w.z === warp.z &&
                        w.dimension === warp.dimension)
                );
                saveWarps(updatedWarps);

                player.dimension.playSound("beacon.deactivate", player.location);
                return player.sendMessage({
                    translate: "warps:warp_details.remove.success",
                    with: [warp.name]
                });
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
                    const warpDimensionId = getPlayerDimension(player);
                    addWarpItemFormStep1(player, {
                        targetLocation: player.location,
                        warpDimensionId: warpDimensionId
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

                        // Jeśli location jest podane, użyj go, w przeciwnym razie użyj lokalizacji gracza
                        const targetLocation = location || player.location;
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
                        try {
                            const warp = getWarpByName(warpName);
                            editWarpNameSave(player, warp, newWarpName);
                        } catch (e) {
                            return player.sendMessage(e);
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
                            if (!player) return;
                            try {
                                const warp = getWarpByName(warpName);
                                removeWarpItemForm(player, warp);
                            } catch (e) {
                                return player.sendMessage(e);
                            }
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
                        let targetLocation = {x: blockLoc.x, y: blockLoc.y, z: blockLoc.z};

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

                        const warpDimensionId = getPlayerDimension(player);
                        addWarpItemFormStep1(player, {
                            targetLocation: targetLocation,
                            warpDimensionId: warpDimensionId
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
