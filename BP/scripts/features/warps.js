import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"
import {system, CustomCommandParamType, CustomCommandStatus} from "@minecraft/server";

export const Warps = () => {
    ///=================================================================================================================
    // === Constants (module scope) ===
    const WORLD_PROP = "warps:data";
    const COMMAND_WARPS_TP = "warps:warps_tp";
    const COMMAND_WARPS_ADD = "warps:warps_add";
    const COMMAND_WARP_REMOVE = "warps:warps_remove";
    const ITEM_COMPONENT_ID = "warps:warp_menu";

    // Lista dostępnych obrazków dla warps
    const WARP_ICONS = [
        {name: "Poi", translationKey: "warps:icon.Poi", path: "textures/icons/Map_Poi.png"},
        {name: "Heart", translationKey: "warps:icon.Heart", path: "textures/icons/Heart_Full.png"},
        {
            name: "Plains_Village",
            translationKey: "warps:icon.Plains Village",
            path: "textures/icons/Map_Plains_Village.png"
        },
        {
            name: "Savanna_Village",
            translationKey: "warps:icon.Savanna Village",
            path: "textures/icons/Map_Savanna_Village.png"
        },
        {
            name: "Snowy_Village",
            translationKey: "warps:icon.Snowy Village",
            path: "textures/icons/Map_Snowy_Village.png"
        },
        {
            name: "Taiga_Village",
            translationKey: "warps:icon.Taiga Village",
            path: "textures/icons/Map_Taiga_Village.png"
        },
        {
            name: "Ocean_Monument",
            translationKey: "warps:icon.Ocean Monument",
            path: "textures/icons/Map_Ocean_Monument.png"
        },
        {
            name: "Woodland_Mansion",
            translationKey: "warps:icon.Woodland Mansion",
            path: "textures/icons/Map_Woodland_Mansion.png"
        },
        {name: "Ore", translationKey: "warps:icon.Ore", path: "textures/icons/Amethyst_Cluster.png"},
        {name: "Boat", translationKey: "warps:icon.Boat", path: "textures/icons/Boat.png"},
        {name: "Brewing_Stand", translationKey: "warps:icon.Brewing stand", path: "textures/icons/Brewing_Stand.png"},
        {name: "Mine", translationKey: "warps:icon.Mine", path: "textures/icons/Chest_Minecart.png"},
        {name: "Crafting", translationKey: "warps:icon.Crafting", path: "textures/icons/Crafting_Table.png"},
        {name: "Enchanting", translationKey: "warps:icon.Enchanting", path: "textures/icons/Enchanting_Table.png"},
        {name: "Food", translationKey: "warps:icon.Food", path: "textures/icons/Food_Full.png"},
        {name: "Agriculture", translationKey: "warps:icon.Agriculture", path: "textures/icons/Grass.png"},
        {name: "Fishing", translationKey: "warps:icon.Fishing", path: "textures/icons/Fishing_Rod.png"},
        {name: "Chest", translationKey: "warps:icon.Chest", path: "textures/icons/Chest.png"},
        {name: "Ender_Chest", translationKey: "warps:icon.Ender_Chest", path: "textures/icons/Ender_Chest.png"},
        {name: "Tnt", translationKey: "warps:icon.Tnt", path: "textures/icons/Tnt.png"},
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

    const selectFieldFromIcon = (field, whereKey, whereValue) => {
        let foundIndex = WARP_ICONS.findIndex(i => i[whereKey].toLowerCase() === whereValue.toLowerCase());
        if (foundIndex === -1) {
            foundIndex = 0; // Domyślnie pierwsza ikona, jeśli nie znaleziono
        }
        if (field === 'index') return foundIndex;
        return WARP_ICONS[foundIndex][field];
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


    const showWarpsListMenuSortedByDistance = (player) => {
        let actionForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:menu.title"}]})

        const warps = getValidWarps();

        if (warps.length === 0) {
            return player.sendMessage({translate: "warps:menu.no_warps"});
        }

        // Pobierz lokalizację gracza
        const playerLocation = player.location;
        const playerDimension = getPlayerDimension(player);

        // Posortuj warpy według odległości od gracza
        const sortedWarps = [...warps].sort((a, b) => {
            // Jeśli warpy są w różnych wymiarach, traktuj je inaczej
            const aSameDimension = a.dimension === playerDimension;
            const bSameDimension = b.dimension === playerDimension;

            // Warpy w tym samym wymiarze co gracz są bliżej
            if (aSameDimension && !bSameDimension) return -1;
            if (!aSameDimension && bSameDimension) return 1;

            // Jeśli oba są w tym samym wymiarze, oblicz odległość
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

            // Jeśli oba są w innych wymiarach, zachowaj oryginalną kolejność
            return 0;
        });

        sortedWarps.forEach(warp => {
            // Oblicz odległość
            let distance = 0;
            const warpSameDimension = warp.dimension === playerDimension;
            if (warpSameDimension) {
                distance = calculateDistance(
                    playerLocation.x, playerLocation.y, playerLocation.z,
                    warp.x, warp.y, warp.z
                );
            }

            // Formatuj odległość (zaokrąglij do 1 miejsca po przecinku)
            const distanceText = warpSameDimension
                ? Math.round(distance).toString()
                : "?";

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
            }, (warp.icon || WARP_ICONS[0].path))
        })

        actionForm
            .show(player).then((res) => {
            if (res.canceled || res.selection >= sortedWarps.length) {
                return;
            }

            const selectedWarp = sortedWarps[res.selection];
            teleportToWarp(player, selectedWarp)
        })
    }

    const addWarpItemMenu = (player, {warpName = "", iconName = "", targetLocation, warpDimensionId}) => {
        // Jeśli ikona jest już wybrana (np. po błędzie), pominij krok 1/2
        if (iconName) {
            const selectedIconIndex = selectFieldFromIcon('index', 'name', iconName);
            if (selectedIconIndex >= 0 && selectedIconIndex < WARP_ICONS.length) {
                showWarpFormStep2(player, warpName, selectedIconIndex, targetLocation, warpDimensionId);
                return;
            }
        }

        // Najpierw pokaż formularz wyboru ikony z widocznymi ikonami (krok 1/2)
        const iconForm = new MinecraftUi.ActionFormData()
            .title({rawtext: [{translate: "warps:add.step1.title"}]})
            .body({rawtext: [{translate: "warps:add.select_icon"}]});

        // Dodaj przyciski z ikonami
        WARP_ICONS.forEach((icon, index) => {
            iconForm.button({
                rawtext: [{translate: icon.translationKey}]
            }, icon.path);
        });

        iconForm.show(player).then((iconRes) => {
            if (iconRes.canceled || iconRes.selection === undefined || iconRes.selection >= WARP_ICONS.length) {
                return;
            }

            const selectedIconIndex = iconRes.selection;
            showWarpFormStep2(player, warpName, selectedIconIndex, targetLocation, warpDimensionId);
        });
    }

    const showWarpFormStep2 = (player, warpName, iconIndex, targetLocation, warpDimensionId) => {
        // Pokaż formularz z pozostałymi polami (krok 2/2)
        new MinecraftUi.ModalFormData()
            .title({rawtext: [{translate: "warps:add.step2.title"}]})
            .textField({rawtext: [{translate: "warps:add.field.name.label"}]}, {rawtext: [{translate: "warps:add.field.name.placeholder"}]}, {defaultValue: warpName})
            .textField({rawtext: [{translate: "warps:add.field.x.label"}]}, {rawtext: [{translate: "warps:add.field.x.placeholder"}]}, {defaultValue: targetLocation.x.toString()})
            .textField({rawtext: [{translate: "warps:add.field.y.label"}]}, {rawtext: [{translate: "warps:add.field.y.placeholder"}]}, {defaultValue: targetLocation.y.toString()})
            .textField({rawtext: [{translate: "warps:add.field.z.label"}]}, {rawtext: [{translate: "warps:add.field.z.placeholder"}]}, {defaultValue: targetLocation.z.toString()})
            .submitButton({rawtext: [{translate: "warps:add.submit"}]})
            .show(player).then((res) => {
            if (res.canceled) {
                return;
            }

            // Indeksy formValues: [0]=name, [1]=x, [2]=y, [3]=z
            if (!res.formValues[0] || !res.formValues[1] || !res.formValues[2] || !res.formValues[3]) {
                player.sendMessage({translate: "warps:add.fill_required"});
                // Ponownie pokaż formularz z wypełnionymi danymi
                showWarpFormStep2(player, warpName, iconIndex, targetLocation, warpDimensionId);
                return;
            }

            warpName = res.formValues[0].replace('"', "'");
            targetLocation.x = parseFloat(res.formValues[1]);
            targetLocation.y = parseFloat(res.formValues[2]);
            targetLocation.z = parseFloat(res.formValues[3]);
            addWarpItem(player, warpName, iconIndex, targetLocation, warpDimensionId);
        });
    }

    const addWarpItem = (player, warpName, iconIndex, targetLocation, warpDimensionId) => {

        const selectedIcon = WARP_ICONS[iconIndex] || WARP_ICONS[0];

        if (isNaN(targetLocation.x) || isNaN(targetLocation.y) || isNaN(targetLocation.z)) {
            player.sendMessage({translate: "warps:add.coords_must_be_number"});
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 2/2, pomijając wybór ikony)
            showWarpFormStep2(player, warpName, iconIndex, targetLocation, warpDimensionId);
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
            // Ponownie pokaż formularz z wypełnionymi danymi (krok 2/2, pomijając wybór ikony)
            showWarpFormStep2(player, warpName, iconIndex, targetLocation, warpDimensionId);
            return;
        }

        const newWarp = {
            name: warpName,
            x: targetLocation.x,
            y: targetLocation.y,
            z: targetLocation.z,
            dimension: warpDimensionId,
            icon: selectedIcon.path
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
            }, (warp.icon || WARP_ICONS[0].path))
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
                            {translate: selectFieldFromIcon('translationKey', 'path', warp.icon)}
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

            event.customCommandRegistry.registerEnum("warps:icon", WARP_ICONS.map(icon => icon.name))

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
                            showWarpsListMenuSortedByDistance(player)
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
                            const iconIndex = selectFieldFromIcon('index', 'name', iconName);
                            addWarpItem(player, warpName, iconIndex, targetLocation, warpDimensionId);
                        } else {
                            addWarpItemMenu(player, {
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
                        showWarpsListMenuSortedByDistance(player);
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

                    addWarpItemMenu(player, {
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
                        showWarpsListMenuSortedByDistance(player);
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
