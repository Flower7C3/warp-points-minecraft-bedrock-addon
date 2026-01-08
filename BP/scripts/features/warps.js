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
        {},
        WarpIcon("Church", "places", "Church.png"),
        {},
        WarpIcon("Police", "places", "Police.png"),
        WarpIcon("Fire_Brigade", "places", "Fire_Brigade.png"),
        WarpIcon("Hospital", "places", "Hospital.png"),
        {},
        WarpIcon("Government", "places", "Government.png"),
        WarpIcon("Bank", "places", "Bank.png"),
        WarpIcon("Museum", "places", "Museum.png"),
        WarpIcon("School", "places", "School.png"),
        WarpIcon("Offices", "places", "Offices.png"),
        WarpIcon("Factory", "places", "Factory.png"),

        // === ZASOBY === (posortowane od najpospolitszych do najrzadszych)
        WarpIcon("Coal", "resources", "Coal.png"),
        WarpIcon("Copper", "resources", "Copper.png"),
        WarpIcon("Iron", "resources", "Iron.png"),
        {},
        WarpIcon("Redstone", "resources", "Redstone.png"),
        WarpIcon("Lapis", "resources", "Lapis.png"),
        WarpIcon("Gold", "resources", "Gold.png"),
        {},
        WarpIcon("Emerald", "resources", "Emerald.png"),
        WarpIcon("Quartz", "resources", "Quartz.png"),
        WarpIcon("Diamond", "resources", "Diamond.png"),
        WarpIcon("Amethyst", "resources", "Amethyst.png"),

        // === FARMY ===
        WarpIcon("Animal_Farm", "farms", "Animal_Farm.png"),
        WarpIcon("Crop_Farm", "farms", "Crop_Farm.png"),
        WarpIcon("Mob_Farm", "farms", "Mob_Farm.png"),

        // === NARZĘDZIA I BLOKI === (posortowane od podstawowych do najrzadszych)
        WarpIcon("Bed", "tools", "Bed.png"),
        WarpIcon("Crafting", "tools", "Crafting_Table.png"),
        {},
        WarpIcon("Furnace", "tools", "Furnace.png"),
        WarpIcon("Campfire", "tools", "Campfire.png"),
        {},
        WarpIcon("Chest", "tools", "Chest.png"),
        WarpIcon("Barrel", "tools", "Barrel.png"),
        WarpIcon("Ender_Chest", "tools", "Ender_Chest.png"),
        WarpIcon("Shulker_Box", "tools", "Shulker_Box.png"),
        {},
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
    // Pobierz unikalne kategorie z ikon
    const getCategories = () => {
        const categories = new Set();
        WARP_ICONS.forEach(icon => {
            if (icon && icon.category) {
                categories.add(icon.category);
            }
        });
        return Array.from(categories);
    }

    // Pobierz ikony z danej kategorii
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

    const showWarpsListMenu = (player) => {
        const warps = getValidWarps();

        if (warps.length === 0) {
            return player.sendMessage({translate: "warps:menu.no_warps"});
        }

        const filterForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:menu.title"}]})
            .body({rawtext: [{translate: "warps:menu.step1.body"}]});

        // Opcja: Wszystkie warpy
        filterForm.button({
            rawtext: [{translate: "warps:menu.step1.filter_all"}]
        });

        filterForm.label({rawtext: [{translate: "warps:menu.step1.select_category"}]});

        // Filtruj kategorie — pokazuj tylko te, które mają warpy
        const allCategories = getCategories();
        const categoriesWithWarps = allCategories.filter(category => {
            return warps.some(warp => {
                const icon = findIconByName(warp.icon);
                return icon && icon.category === category;
            });
        });

        // Opcje dla każdej kategorii z warpsami
        categoriesWithWarps.forEach(category => {
            const categoryIcon = WARP_ICONS.find(icon => icon && icon.category === category);
            filterForm.button({
                rawtext: [{
                    translate: "warps:menu.step1.filter_category",
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
                    filteredWarps = warps.filter(warp => {
                        const icon = findIconByName(warp.icon);
                        return icon && icon.category === selectedCategory;
                    });
                }
            }

            if (filteredWarps.length === 0) {
                return player.sendMessage({translate: "warps:menu.no_warps_in_category"});
            }

            // Od razu pokaż listę posortowaną wg dystansu
            showWarpsListMenuWithOptions(player, filteredWarps, 'distance', selectedCategory);
        });
    }

    const showWarpsListMenuWithOptions = (player, warps, sortBy, selectedCategory = null) => {

        const actionForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:menu.title"}]})

        // Przycisk do zmiany sortowania na pierwszej pozycji
        const sortButtonText = sortBy === 'distance'
            ? {rawtext: [{translate: "warps:menu.step2.sort_change_to_alphabetical"}]}
            : {rawtext: [{translate: "warps:menu.step2.sort_change_to_distance"}]};

        actionForm.button(sortButtonText)

        const actionFormLabel = selectedCategory
            ? {
                rawtext: [{
                    translate: "warps:menu.step2.select_category",
                    with: {
                        rawtext: [{translate: `warps:category.${selectedCategory}`}]
                    }
                }]
            }
            : {
                rawtext: [{translate: "warps:menu.step2.select_all"}]
            };
        actionForm.label(actionFormLabel)

        let sortedWarps = [...warps];

        if (sortBy === 'distance') {
            // Sortuj wg dystansu
            const playerLocation = player.location;
            const playerDimension = getPlayerDimension(player);

            sortedWarps.sort((a, b) => {
                const aSameDimension = a.dimension === playerDimension;
                const bSameDimension = b.dimension === playerDimension;

                if (aSameDimension && !bSameDimension) return -1;
                if (!aSameDimension && bSameDimension) return 1;

                if (aSameDimension && bSameDimension) {
                    const distA = calculateDistance(
                        playerLocation.x, playerLocation.y, playerLocation.z,
                        a.x, a.y, a.z
                    );
                    const distB = calculateDistance(
                        playerLocation.x, playerLocation.y, playerLocation.z,
                        b.x, b.y, b.z
                    );
                    return distA - distB;
                }

                return 0;
            });
        } else {
            // Sortuj alfabetycznie
            sortedWarps.sort((a, b) => a.name.localeCompare(b.name));
        }

        const playerLocation = player.location;
        const playerDimension = getPlayerDimension(player);

        sortedWarps.forEach(warp => {
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

            const icon = findIconByName(warp.icon);
            actionForm.button({
                rawtext: [{
                    translate: "warps:menu.button_format",
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
            }, icon ? icon.path : "");
        });

        actionForm.show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            // Jeśli wybrano przycisk zmiany sortowania (indeks 0)
            if (res.selection === 0) {
                const newSortBy = sortBy === 'distance' ? 'alphabetical' : 'distance';
                showWarpsListMenuWithOptions(player, warps, newSortBy, selectedCategory);
                return;
            }

            // Jeśli wybrano warp (indeks > 0, ale trzeba odjąć 1 bo pierwszy to przycisk sortowania)
            const warpIndex = res.selection - 1;
            if (warpIndex >= 0 && warpIndex < sortedWarps.length) {
                const selectedWarp = sortedWarps[warpIndex];
                teleportToWarp(player, selectedWarp);
            }
        });
    }

    const showAddWarpFormStep1 = (player, {
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
                showAddWarpFormStep3(player, warpName, selectedIcon, targetLocation, warpDimensionId);
                return;
            }
        }

        // Krok 1/3: Wybór kategorii
        const categories = getCategories();
        const categoryForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:add.step1.title"}]})
            .body({rawtext: [{translate: "warps:add.select_category"}]});

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
            showAddWarpFormStep2(player, warpName, selectedCategory, targetLocation, warpDimensionId);
        });
    }

    const showAddWarpFormStep2 = (player, warpName, category, targetLocation, warpDimensionId) => {
        // Krok 2/3: Wybór ikony z wybranej kategorii
        const categoryIcons = WARP_ICONS.filter(icon => icon && icon.category === category);

        const iconForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:add.step2.title"}]})
            .body({rawtext: [{translate: "warps:add.select_icon"}]});

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

            showAddWarpFormStep3(player, warpName, selectedIcon, targetLocation, warpDimensionId);
        });
    }

    const showAddWarpFormStep3 = (player, warpName, icon, targetLocation, warpDimensionId) => {
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
                showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
                return;
            }

            warpName = res.formValues[warpNameIndex].replace('"', "'");
            targetLocation.x = parseFloat(res.formValues[targetLocationXIndex].toString());
            targetLocation.y = parseFloat(res.formValues[targetLocationYIndex].toString());
            targetLocation.z = parseFloat(res.formValues[targetLocationZIndex].toString());
            addWarpItem(player, warpName, icon, targetLocation, warpDimensionId);
        });
    }

    const addWarpItem = (player, warpName, icon, targetLocation, warpDimensionId) => {

        if (isNaN(targetLocation.x) || isNaN(targetLocation.y) || isNaN(targetLocation.z)) {
            player.sendMessage({translate: "warps:add.coords_must_be_number"});
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 3/3, pomijając wybór kategorii i ikony)
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
            return;
        }

        const warps = loadWarps();

        targetLocation.x = Math.round(targetLocation.x);
        targetLocation.y = Math.round(targetLocation.y);
        targetLocation.z = Math.round(targetLocation.z);

        // Check if warp with same name already exists
        if (warps.some(w => w.name === warpName)) {
            player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [warpName]
            });
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 3/3, pomijając wybór kategorii i ikony)
            showAddWarpFormStep3(player, warpName, icon, targetLocation, warpDimensionId);
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

    const removeWarpItemMenu = (player) => {
        let actionForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:remove.title"}]})

        const warps = getValidWarps();

        if (warps.length === 0) {
            return player.sendMessage({translate: "warps:menu.no_warps"});
        }

        // Posortuj warpy według nazwy (alfabetycznie)
        const sortedWarps = [...warps].sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        sortedWarps.forEach(warp => {
            actionForm.button({
                rawtext: [{
                    translate: "warps:remove.button_format",
                    with: {
                        rawtext: [
                            {text: warp.name},
                            {text: warp.x.toString()},
                            {text: warp.y.toString()},
                            {text: warp.z.toString()},
                            {translate: getDimensionTranslationKey(warp.dimension)},
                        ]
                    }
                }]
            }, (warp.icon ? (WARP_ICONS.find(icon => icon && icon.name === warp.icon) || {}).path || "" : (WARP_ICONS.find(icon => icon && icon.path) || {}).path || ""))
        })

        actionForm.show(player).then((res) => {
            if (res.canceled || res.selection >= sortedWarps.length) {
                return;
            }

            const selectedWarp = sortedWarps[res.selection];
            confirmRemoveWarp(player, selectedWarp);
        })
    }

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
        const icon = findIconByName(warp.icon)
        new MinecraftUi.MessageFormData()
            .title({rawtext: [{translate: "warps:remove.confirm.title"}]})
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
                            {translate: icon.translatedCategory},
                            {translate: icon.translatedName}
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
                            showWarpsListMenu(player)
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
                            removeWarpItemMenu(player)
                        }
                    })
                }
            )

            ///=================================================================================================================
            // === Item Component Registration ===
            event.itemComponentRegistry.registerCustomComponent(ITEM_COMPONENT_ID, {
                onUseOn: (event) => {
                    const player = event.source && event.source.typeId === "minecraft:player" ? event.source : null;
                    const item = event.itemStack;
                    const block = event.block;
                    if (!player || !item || !block) return;
                    useLock.set(player.id, true);
                    system.runTimeout(() => useLock.delete(player.id), 1);
                    if (!player.isSneaking) {
                        showWarpsListMenu(player);
                        return;
                    }
                    if (block.typeId === "air") return;

                    // Określ kierunek kliknięcia i dodaj 1 blok w tym kierunku
                    const blockLoc = block.location;
                    let targetLocation = {x: blockLoc.x, y: blockLoc.y, z: blockLoc.z};

                    switch (event.blockFace) {
                        case Minecraft.Direction.Up:
                            targetLocation.y += 1; // Dodaj 1 blok w górę (nad blokiem)
                            break;
                        case Minecraft.Direction.Down:
                            targetLocation.y -= 1; // Dodaj 1 blok w dół (pod blokiem)
                            break;
                        case Minecraft.Direction.North:
                            targetLocation.z -= 1; // Dodaj 1 blok na północ (obok bloku)
                            break;
                        case Minecraft.Direction.South:
                            targetLocation.z += 1; // Dodaj 1 blok na południe (obok bloku)
                            break;
                        case Minecraft.Direction.East:
                            targetLocation.x += 1; // Dodaj 1 blok na wschód (obok bloku)
                            break;
                        case Minecraft.Direction.West:
                            targetLocation.x -= 1; // Dodaj 1 blok na zachód (obok bloku)
                            break;
                        default:
                            targetLocation.y += 1; // Domyślnie nad blokiem
                            break;
                    }

                    showAddWarpFormStep1(player, {
                        targetLocation: targetLocation,
                        warpDimensionId: getPlayerDimension(player)
                    })
                },
                onUse: (event) => {
                    const player = event.source;
                    const item = event.itemStack;
                    if (!player || !item) return;
                    system.runTimeout(() => {
                        if (useLock.has(player.id)) return;
                        if (player.isSneaking) return;
                        showWarpsListMenu(player);
                    }, 1);
                },
            })
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
