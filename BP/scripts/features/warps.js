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
    const COMMAND_WARP_REMOVE = "warps:warps_remove";
    const ITEM_COMPONENT_ID = "warps:warp_menu";

    // Lista dostępnych obrazków dla warps — zorganizowane w kategorie, posortowane alfabetycznie
    const WARP_ICONS = [
        // === LOKACJE SPECJALNE ===
        WarpIcon("Map_Marker", "special", "Map_Marker.png"),
        WarpIcon("Heart", "special", "Heart_Full.png"),
        WarpIcon("Spawn", "special", "Map_Poi.png"),

        // === MIEJSCA ===
        WarpIcon("Home", "places", "Home.png"),
        WarpIcon("Hotel", "places", "Hotel.png"),
        WarpIcon("Castle", "places", "Castle.png"),
        WarpIcon("Tower", "places", "Tower.png"),
        WarpIcon("Lighthouse", "places", "Lighthouse.png"),
        WarpIcon("Church", "places", "Church.png"),
        WarpIcon("Police", "places", "Police.png"),
        WarpIcon("Fire_Brigade", "places", "Fire_Brigade.png"),
        WarpIcon("Hospital", "places", "Hospital.png"),
        WarpIcon("Government", "places", "Government.png"),
        WarpIcon("Bank", "places", "Bank.png"),
        WarpIcon("Museum", "places", "Museum.png"),
        WarpIcon("School", "places", "School.png"),
        WarpIcon("Offices", "places", "Offices.png"),
        WarpIcon("Factory", "places", "Factory.png"),
        WarpIcon("Warehouse", "places", "Warehouse.png"),

        // === ZASOBY === (posortowane od najpospolitszych do najrzadszych)
        WarpIcon("Coal", "resources", "Coal.png"),
        WarpIcon("Copper", "resources", "Copper.png"),
        WarpIcon("Iron", "resources", "Iron.png"),
        WarpIcon("Redstone", "resources", "Redstone.png"),
        WarpIcon("Lapis", "resources", "Lapis.png"),
        WarpIcon("Gold", "resources", "Gold.png"),
        WarpIcon("Emerald", "resources", "Emerald.png"),
        WarpIcon("Quartz", "resources", "Quartz.png"),
        WarpIcon("Diamond", "resources", "Diamond.png"),
        WarpIcon("Amethyst", "resources", "Amethyst.png"),
        WarpIcon("TNT", "resources", "TNT.png"),

        // === FARMY ===
        WarpIcon("Animal_Farm", "farms", "Animal_Farm.png"),
        WarpIcon("Crop_Farm", "farms", "Crop_Farm.png"),
        WarpIcon("Mob_Farm", "farms", "Mob_Farm.png"),

        // === NARZĘDZIA I BLOKI === (posortowane od podstawowych do najrzadszych)
        WarpIcon("Bed", "tools", "Bed.png"),
        WarpIcon("Crafting", "tools", "Crafting_Table.png"),
        WarpIcon("Furnace", "tools", "Furnace.png"),
        WarpIcon("Campfire", "tools", "Campfire.png"),
        WarpIcon("Chest", "tools", "Chest.png"),
        WarpIcon("Barrel", "tools", "Barrel.png"),
        WarpIcon("Ender_Chest", "tools", "Ender_Chest.png"),
        WarpIcon("Shulker_Box", "tools", "Shulker_Box.png"),
        WarpIcon("Composter", "tools", "Composter.png"),
        WarpIcon("Bell", "tools", "Bell.png"),
        WarpIcon("Anvil", "tools", "Anvil.png"),
        WarpIcon("Enchanting", "tools", "Enchanting_Table.png"),
        WarpIcon("Brewing_Stand", "tools", "Brewing_Stand.png"),
        WarpIcon("Smithing_Table", "tools", "Smithing_Table.png"),
        WarpIcon("Loom", "tools", "Loom.png"),
        WarpIcon("Cartography_Table", "tools", "Cartography_Table.png"),
        WarpIcon("Stonecutter", "tools", "Stonecutter.png"),
        WarpIcon("Grindstone", "tools", "Grindstone.png"),
        WarpIcon("Lodestone", "tools", "Lodestone.png"),
        WarpIcon("Respawn_Anchor", "tools", "Respawn_Anchor.png"),
        WarpIcon("Beacon", "tools", "Beacon.png"),
        WarpIcon("Spawner", "tools", "Spawner.png"),
    ];

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
            console.error(`[WARPS!] Error teleporting to warp ${warp.name}:`, error);
            player.sendMessage({
                translate: "warps:teleport.error",
                with: [warp.name]
            });
        }
    }

    ///=================================================================================================================
    // === Menu Functions ===
    const showWarpsListMenu = (player, mode = 'teleport') => {
        const warps = getValidWarps();

        if (warps.length === 0) {
            return player.sendMessage({translate: "warps:menu.no_warps"});
        }

        const filterFormTitle = mode === 'teleport'
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
            const defaultSortBy = mode === 'teleport' ? 'distance' : 'alphabetical';
            showWarpsListMenuWithOptions(player, filteredWarps, defaultSortBy, selectedCategory, mode);
        });
    }

    const showWarpsListMenuWithOptions = (player, warps, sortBy, selectedCategory = null, mode = 'teleport') => {
        // Tytuł formularza
        let actionFormTitle;
        if (mode === 'teleport') {
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
        if (mode === 'teleport') {
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
                if (mode === 'teleport') {
                    teleportToWarp(player, selectedWarp);
                } else {
                    showWarpOptionsMenu(player, selectedWarp);
                }
            }
        });
    }

    // Wrapper functions for compatibility
    const showWarpsListMenuForTeleport = (player) => {
        showWarpsListMenu(player, 'teleport');
    }

    const showWarpsListMenuForManagement = (player) => {
        showWarpsListMenu(player, 'management');
    }

    const showWarpOptionsMenu = (player, warp) => {
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
                    editWarpName(player, warp);
                    break;
                case 2: // Zmień ikonę
                    editWarpIcon(player, warp);
                    break;
                case 3: // Usuń
                    confirmRemoveWarp(player, warp);
                    break;
            }
        });
    }

    const editWarpName = (player, warp) => {
        system.run(() => {
            const nameForm = new MinecraftUi.ModalFormData()
                .title({
                    rawtext: [{
                        translate: "warps:manage_menu.edit_name.title",
                        with: {rawtext: [{text: warp.name}]}
                    }]
                })
                .textField(
                    {rawtext: [{translate: "warps:add.field.name.new_name"}]},
                    {rawtext: [{translate: "warps:add.field.name.placeholder"}]},
                    {defaultValue: warp.name}
                )
                .submitButton({rawtext: [{translate: "warps:add.submit"}]})
                .show(player).then((res) => {
                    if (res.canceled) {
                        return;
                    }

                    console.info(res.formValues)
                    console.info(res.formValues.length)

                    if (!res.formValues || res.formValues.length === 0) {
                        player.sendMessage({translate: "warps:add.fill_required"});
                        editWarpName(player, warp);
                        return;
                    }

                    const newName = res.formValues[0]?.toString().trim();
                    if (!newName || newName.length === 0) {
                        player.sendMessage({translate: "warps:add.fill_required"});
                        editWarpName(player, warp);
                        return;
                    }

                    if (newName.length > 50) {
                        player.sendMessage({translate: "warps:add.name_too_long"});
                        editWarpName(player, warp);
                        return;
                    }

                    const warps = loadWarps();
                    const warpIndex = warps.findIndex(w => w.name === warp.name);

                    if (warpIndex === -1) {
                        player.sendMessage({translate: "warps:manage_menu.edit_name.not_found"});
                        return;
                    }

                    // Sprawdź czy nowa nazwa nie jest już zajęta (jeśli się zmieniła)
                    if (newName !== warp.name && warps.some(w => w.name === newName)) {
                        player.sendMessage({
                            translate: "warps:add.duplicate_name",
                            with: [newName]
                        });
                        editWarpName(player, warp);
                        return;
                    }

                    const oldName = warp.name;
                    warps[warpIndex].name = newName;
                    saveWarps(warps);

                    player.dimension.playSound("beacon.activate", player.location);
                    player.sendMessage({
                        translate: "warps:manage_menu.edit_name.success",
                        with: [oldName, newName]
                    });
                });
        });
    }

    const editWarpIcon = (player, warp) => {
        // Krok 1: Wybór kategorii
        const categories = getCategories();
        const categoryForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:manage_menu.edit_icon.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body({rawtext: [{translate: "warps:manage_menu.edit_icon.categories.body"}]});

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
            editWarpIconStep2(player, warp, selectedCategory);
        });
    }

    const editWarpIconStep2 = (player, warp, category) => {
        // Krok 2: Wybór ikony z wybranej kategorii
        const categoryIcons = WARP_ICONS.filter(icon => icon && icon.category === category);

        const iconForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:manage_menu.edit_icon.category.title",
                    with: {rawtext: [{translate: `warps:category.${category}`}]}
                }]
            })
            .body({rawtext: [{translate: "warps:manage_menu.edit_icon.category.body"}]});

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
                player.sendMessage({translate: "warps:manage_menu.edit_name.not_found"});
                return;
            }

            warps[warpIndex].icon = selectedIcon.name;
            saveWarps(warps);

            player.dimension.playSound("beacon.activate", player.location);
            player.sendMessage({
                translate: "warps:manage_menu.edit_icon.success",
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
    // === Add Functions ===
    const showAddWarpFormStep1 = (player, {
        warpName = "",
        iconName = "",
        category = "",
        targetLocation,
        warpDimensionId,
        isEditing = false,
        existingWarpName = null
    }) => {
        // Jeśli kategoria i ikona są już wybrane (np. po błędzie), pominij krok 1 i 2
        if (category && iconName) {
            const categoryIcons = getIconsByCategory(category);
            const selectedIcon = categoryIcons.find(icon => icon.name === iconName);
            if (selectedIcon) {
                showAddWarpFormStep3(player, warpName, selectedIcon, targetLocation, warpDimensionId, isEditing, existingWarpName);
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
            showAddWarpFormStep2(player, warpName, selectedCategory, targetLocation, warpDimensionId, isEditing, existingWarpName);
        });
    }

    const showAddWarpFormStep2 = (player, warpName, category, targetLocation, warpDimensionId, isEditing = false, existingWarpName = null) => {
        // Krok 2/3: Wybór ikony z wybranej kategorii
        const categoryIcons = WARP_ICONS.filter(icon => icon && icon.category === category);

        const iconForm = new MinecraftUi.ActionFormData()
            .title({
                rawtext: [{
                    translate: "warps:add.step2.title",
                    with: {rawtext: [{translate: `warps:category.${category}`}]}
                }]
            })
            .body({rawtext: [{translate: "warps:add.step2.body"}]});

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

            showAddWarpFormStep3(player, warpName, selectedIcon, targetLocation, warpDimensionId, isEditing, existingWarpName);
        });
    }

    const showAddWarpFormStep3 = (player, warpName, icon, targetLocation, warpDimensionId, isEditing = false, existingWarpName = null) => {
        // Krok 3/3: Nazwa i współrzędne
        const formTitle = isEditing
            ? {
                rawtext: [{
                    translate: "warps:manage_menu.edit_icon.details.title", with: {
                        rawtext: [
                            {translate: existingWarpName},
                            {translate: existingWarpName},
                        ]
                    }
                }]
            }
            : {rawtext: [{translate: "warps:add.step3.title"}]};
        const formBody = isEditing
            ? {rawtext: [{translate: "warps:manage_menu.edit_icon.details.body"}]}
            : {rawtext: [{translate: "warps:add.step3.body"}]};

        const form = new MinecraftUi.ModalFormData()
            .title(formTitle)
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
                    showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId, isEditing, existingWarpName);
                    return;
                }

                warpName = res.formValues[warpNameIndex].replace('"', "'");
                targetLocation.x = parseFloat(res.formValues[targetLocationXIndex].toString());
                targetLocation.y = parseFloat(res.formValues[targetLocationYIndex].toString());
                targetLocation.z = parseFloat(res.formValues[targetLocationZIndex].toString());
                addWarpItem(player, warpName, icon, targetLocation, warpDimensionId, existingWarpName);
            });
    }

    const addWarpItem = (player, warpName, icon, targetLocation, warpDimensionId, existingWarpName = null) => {
        const isEditing = existingWarpName !== null;

        // Walidacja ikony
        if (!icon || !icon.name) {
            player.sendMessage({translate: "warps:add.invalid_icon"});
            if (existingWarpName) {
                // Jeśli edytujemy, wróć do menu opcji
                const warps = loadWarps();
                const warp = warps.find(w => w.name === existingWarpName);
                if (warp) {
                    showWarpOptionsMenu(player, warp);
                }
            } else {
                showAddWarpFormStep1(player, {warpName, targetLocation, warpDimensionId});
            }
            return;
        }

        // Walidacja nazwy
        if (!warpName || warpName.trim().length === 0) {
            player.sendMessage({translate: "warps:add.fill_required"});
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId, isEditing, existingWarpName);
            return;
        }

        if (warpName.length > 50) {
            player.sendMessage({translate: "warps:add.name_too_long"});
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId, isEditing, existingWarpName);
            return;
        }

        if (isNaN(targetLocation.x) || isNaN(targetLocation.y) || isNaN(targetLocation.z)) {
            player.sendMessage({translate: "warps:add.coords_must_be_number"});
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 3/3, pomijając wybór kategorii i ikony)
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId, isEditing, existingWarpName);
            return;
        }

        // Walidacja współrzędnych (rozsądne limity)
        // Y może być od -64 do 320 w Bedrock Edition (od wersji 1.18+)
        if (Math.abs(targetLocation.x) > 30000000 || targetLocation.y < -64 || targetLocation.y > 320 || Math.abs(targetLocation.z) > 30000000) {
            player.sendMessage({translate: "warps:add.coords_out_of_range"});
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId, isEditing, existingWarpName);
            return;
        }

        const warps = loadWarps();

        targetLocation.x = Math.round(targetLocation.x);
        targetLocation.y = Math.round(targetLocation.y);
        targetLocation.z = Math.round(targetLocation.z);

        const warpIndex = isEditing ? warps.findIndex(w => w.name === existingWarpName) : -1;

        // Check if warp with same name already exists (tylko jeśli nie edytujemy lub zmieniamy nazwę)
        if (!isEditing && warps.some(w => w.name === warpName)) {
            player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [warpName]
            });
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 3/3, pomijając wybór kategorii i ikony)
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId, isEditing, existingWarpName);
            return;
        }

        // Jeśli edytujemy i zmieniamy nazwę, sprawdź czy nowa nazwa nie jest zajęta
        if (isEditing && warpName !== existingWarpName && warps.some(w => w.name === warpName)) {
            player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [warpName]
            });
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId, isEditing, existingWarpName);
            return;
        }

        if (isEditing && warpIndex !== -1) {
            // Edycja istniejącego warpa
            warps[warpIndex].name = warpName;
            warps[warpIndex].icon = icon.name;
            saveWarps(warps);

            player.dimension.playSound("beacon.activate", player.location);
            player.sendMessage({
                translate: "warps:manage_menu.edit_icon.success",
                with: {
                    rawtext: [
                        {text: warpName},
                        {translate: icon.translatedName}
                    ]
                }
            });
        } else {
            // Dodawanie nowego warpa
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
    }

    ///=================================================================================================================
    // === Remove Functions ===

    const removeWarpItemByName = (player, warpName) => {
        const warps = getValidWarps();
        const warp = warps.find(w => w.name.toLowerCase() === warpName.toLowerCase());

        if (!warp) {
            return player.sendMessage({
                translate: "warps:teleport.not_found",
                with: [warpName]
            });
        }

        confirmRemoveWarp(player, warp);
    }

    const confirmRemoveWarp = (player, warp) => {
        const {categoryText, iconText} = getWarpIconTexts(warp);

        new MinecraftUi.MessageFormData()
            .title({
                rawtext: [{
                    translate: "warps:remove.confirm.title",
                    with: {rawtext: [{text: warp.name}]}
                }]
            })
            .body({
                rawtext: [{
                    translate: "warps:remove.confirm.body",
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
            .button1({rawtext: [{translate: "warps:remove.confirm.yes"}]})
            .button2({rawtext: [{translate: "warps:remove.confirm.no"}]})
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
                    translate: "warps:remove.success",
                    with: [warp.name]
                });
            }
        })
    }

    ///=================================================================================================================
    // === Main Menu ===
    const showMainMenu = (player) => {
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
                    showWarpsListMenuForTeleport(player);
                    break;
                case 1: // Zarządzaj
                    showWarpsListMenuForManagement(player);
                    break;
                case 2: // Dodaj
                    const warpDimensionId = getPlayerDimension(player);
                    showAddWarpFormStep1(player, {
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
            console.info("[WARPS!] Loaded Script")

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
                            showWarpsListMenuForTeleport(player)
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
                            addWarpItem(player, warpName, icon, targetLocation, warpDimensionId);
                        } else {
                            showAddWarpFormStep1(player, {
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
                            removeWarpItemByName(player, warpName)
                        } else {
                            showWarpsListMenuForManagement(player)
                        }
                    })
                }
            )

            ///=================================================================================================================
            // === Item Component Registration ===
            event.itemComponentRegistry.registerCustomComponent(ITEM_COMPONENT_ID, {
                onUseOn: (event) => {
                    system.run(() => {
                        const player = event.source && event.source.typeId === "minecraft:player" ? event.source : null;
                        const item = event.itemStack;
                        const block = event.block;
                        if (!player || !item || !block) return;
                        if (useLock.has(player.id)) return;
                        useLock.set(player.id, true);
                        system.runTimeout(() => useLock.delete(player.id), 1);
                        if (!player.isSneaking) {
                            showMainMenu(player);
                            return;
                        }
                        if (block.typeId === "air") return;

                        // Shift+click na blok = dodawanie warpa
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
                        showAddWarpFormStep1(player, {
                            targetLocation: targetLocation,
                            warpDimensionId: warpDimensionId
                        });
                    });
                },
                onUse: (event) => {
                    system.run(() => {
                        const player = event.source && event.source.typeId === "minecraft:player" ? event.source : null;
                        if (!player) return;
                        if (useLock.has(player.id)) return;
                        useLock.set(player.id, true);
                        system.runTimeout(() => useLock.delete(player.id), 1);
                        showMainMenu(player);
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
