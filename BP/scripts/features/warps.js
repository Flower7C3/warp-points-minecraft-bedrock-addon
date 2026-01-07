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
        {name: "location pin", path: "textures/icons/location-pin-svgrepo-com.png"},
        {name: "heart", path: "textures/icons/heart-svgrepo-com.png"},
        {name: "house", path: "textures/icons/house-svgrepo-com.png"},
        {name: "building", path: "textures/icons/building-svgrepo-com.png"},
        {name: "bank", path: "textures/icons/bank-svgrepo-com.png"},
        {name: "shop", path: "textures/icons/shop-svgrepo-com.png"},
        {name: "tree decidious", path: "textures/icons/tree-decidious-svgrepo-com.png"},
        {name: "tree evergreen", path: "textures/icons/tree-evergreen-svgrepo-com.png"},

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

        try {
            const dimension = getWarpDimension(warp.dimension);
            dimension.runCommand(`tp "${player.name}" ${warp.x} ${warp.y} ${warp.z}`);
            // player.sendMessage({
            //     translate: "warps:teleport.success",
            //     with: [warp.name]
            // });
        } catch (error) {
            console.error(`[WARPS!] Error teleporting to warp ${warpName}:`, error);
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
                //return player.sendMessage({translate: "warps:menu.canceled_teleport"});
            }

            console.info('[WARPS] Selected warp: ' + res.selection)

            const selectedWarp = sortedWarps[res.selection];
            getWarpDimension(selectedWarp.dimension).runCommand(`tp "${player.name}" ${selectedWarp.x} ${selectedWarp.y} ${selectedWarp.z}`)
        })
    }

    const addWarpItemMenu = (player, location, {name = "", iconName = "", addX = 0, addY = 0, addZ = 0}) => {
        const xCoord = Math.round(location.x + addX);
        const yCoord = Math.round(location.y + addY);
        const zCoord = Math.round(location.z + addZ);
        const dimensionId = getPlayerDimension(player);

        // Przygotuj listę opcji dla dropdown z obrazkami
        const iconOptions = WARP_ICONS.map(icon => icon.name);
        let selectedIconIndex = 0;
        if (iconName !== "") {
            const foundIndex = WARP_ICONS.findIndex(i => i.name.toLowerCase() === iconName.toLowerCase());
            if (foundIndex !== -1) {
                selectedIconIndex = foundIndex;
            }
        }

        new MinecraftUi.ModalFormData()
            .title({rawtext: [{translate: "warps:add.title"}]})
            .textField({rawtext: [{translate: "warps:add.field.name"}]}, {
                    rawtext: [{translate: "warps:add.field.name.placeholder"}]
                }, {defaultValue: name}
            )
            .dropdown({rawtext: [{translate: "warps:add.field.icon"}]}, iconOptions, {defaultValueIndex: selectedIconIndex})
            .textField({rawtext: [{translate: "warps:add.field.x"}]}, {
                rawtext: [{translate: "warps:add.field.x.placeholder", with: [xCoord.toString()]}]
            }, {defaultValue: xCoord.toString()})
            .textField({rawtext: [{translate: "warps:add.field.y"}]}, {
                rawtext: [{translate: "warps:add.field.y.placeholder", with: [yCoord.toString()]}]
            }, {defaultValue: yCoord.toString()})
            .textField({rawtext: [{translate: "warps:add.field.z"}]}, {
                rawtext: [{translate: "warps:add.field.z.placeholder", with: [zCoord.toString()]}]
            }, {defaultValue: zCoord.toString()})
            .textField({rawtext: [{translate: "warps:add.field.dimension"}]}, {
                rawtext: [{translate: "warps:add.field.dimension.placeholder", with: [dimensionId]}]
            }, {defaultValue: dimensionId})
            .show(player).then((res) => {
            if (res.canceled) {
                return;
                //return player.sendMessage({translate: "warps:add.canceled"});
            }

            // Indeksy formValues: [0]=name, [1]=icon, [2]=x, [3]=y, [4]=z, [5]=dimension
            if (!res.formValues[0] || !res.formValues[2] || !res.formValues[3] || !res.formValues[4] || !res.formValues[5]) {
                return player.sendMessage({translate: "warps:add.fill_required"});
            }

            const warpName = res.formValues[0].replace('"', "'");
            const iconName = res.formValues[1] !== undefined ? res.formValues[1] : "";
            const warpX = parseFloat(res.formValues[2]);
            const warpY = parseFloat(res.formValues[3]);
            const warpZ = parseFloat(res.formValues[4]);
            const warpDimension = res.formValues[5].toLowerCase();
            addWarpItem(player, warpName, iconName, warpX, warpY, warpZ, warpDimension);
        })
    }

    const addWarpItem = (player, warpName, iconName, warpX, warpY, warpZ, warpDimension) => {

        // Znajdź indeks ikony na podstawie nazwy przekazanej jako parametr
        let selectedIconIndex = 0;
        if (iconName !== "") {
            const foundIndex = WARP_ICONS.findIndex(i => i.name.toLowerCase() === iconName.toLowerCase());
            if (foundIndex !== -1) {
                selectedIconIndex = foundIndex;
            }
        }
        const selectedIcon = WARP_ICONS[selectedIconIndex] || WARP_ICONS[0];

        if (isNaN(warpX) || isNaN(warpY) || isNaN(warpZ)) {
            return player.sendMessage({translate: "warps:add.coords_must_be_number"});
        }

        if (warpDimension.toLowerCase() !== "overworld" && warpDimension.toLowerCase() !== "nether" && warpDimension.toLowerCase() !== "the_end") {
            return player.sendMessage({translate: "warps:add.dimension_invalid"});
        }

        const warps = loadWarps();

        // Check if warp with same name already exists
        if (warps.some(w => w.name === warpName)) {
            return player.sendMessage({
                translate: "warps:add.duplicate_name",
                with: [warpName]
            });
        }

        const newWarp = {
            name: warpName,
            x: Math.round(warpX),
            y: Math.round(warpY),
            z: Math.round(warpZ),
            dimension: warpDimension,
            icon: selectedIcon.path
        };

        warps.push(newWarp);
        saveWarps(warps);

        player.sendMessage({
            translate: "warps:add.success",
            with: [warpName, Math.round(warpX).toString(), Math.round(warpY).toString(), Math.round(warpZ).toString()]
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
                            {translate: getDimensionTranslationKey(warp.dimension)}
                        ]
                    }
                }]
            }, (warp.icon || WARP_ICONS[0].path))
        })

        actionForm.show(player).then((res) => {
            if (res.canceled || res.selection >= sortedWarps.length) {
                return;
                // return player.sendMessage({translate: "warps:remove.canceled"});
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
                            {translate: getDimensionTranslationKey(warp.dimension)}
                        ]
                    }
                }]
            })
            .button1({rawtext: [{translate: "warps:remove.confirm.yes"}]})
            .button2({rawtext: [{translate: "warps:remove.confirm.no"}]})
            .show(player).then((res) => {
            if (res.selection === 1 || res.canceled) {
                return;
                // return player.sendMessage({translate: "warps:remove.not_deleted", with: [warp.name]});
            } else if (res.selection === 0) {
                const allWarps = loadWarps();
                const updatedWarps = allWarps.filter(w =>
                    !(w.name === warp.name &&
                        w.x === warp.x &&
                        w.y === warp.y &&
                        w.z === warp.z &&
                        w.dimension === warp.dimension)
                );
                saveWarps(updatedWarps);

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


            event.customCommandRegistry.registerEnum("warps:icons", WARP_ICONS.map(icon => icon.name))
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
                        name: "warps:icons",
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
                        if (warpName && iconName && targetLocation) {
                            addWarpItem(player, warpName, iconName, targetLocation.x, targetLocation.y, targetLocation.z, getPlayerDimension(player));
                        } else {
                            addWarpItemMenu(player, targetLocation, {name: warpName, iconName: iconName})
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
                    addWarpItemMenu(player, block.location, {addY: 1})
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
