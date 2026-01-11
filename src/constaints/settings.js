export const blurSettingsOptions = {
    general: [
        {
            name: "Rename connections to friends?",
            details: "Remanes conenctions to friends on Roblox",
            type: "toggle",
            storageKey: "renameConnectionsToFriends"
        }
    ],
    home: [
        {
            name: "Remove Connect Button From Friends Row?",
            details: "Removes the connect button from the friends row on the home page",
            type: "toggle",
            storageKey: "removeConnectButton"
        },
        {
            name: "Home Greeting",
            type: "subLabel"
        },
        {
            name: "Change the home greeting text",
            details: 'Change what the home greeting says /n {geeting} returns a time based greeting ex: "Moring" /n {username} says your username /n {displayName} returns your display name',
            type: "string",
            storageKey: "homeGreeting"
        },
        {
            name: "Celebate the users birthday on the home header",
            details: "Shows the user a brithday message by getting their birthday set on Roblox",
            type: "toggle",
            storageKey: "celerbateUsersBirthday"
        }
    ],
    profile: [
        {
            name: "Show Mutual Friends",
            details: "Shows the amount of friends you share with another user",
            type: "toggle",
            storageKey: "showMutualFriends"
        },
        {
            name: "Display Name Chat Color",
            details: "Changes the color of the user's display name to match their in-game chat color",
            type: "toggle",
            storageKey: "displayNameChatColor"
        },
        {
            name: "Show Revamped Currently Wearing",
            details: "Shows a better currenly wearing section that shows more details and the users outfits",
            type: "toggle",
            storageKey: "injectCustomCurrenlyWearing"
        }
    ],
    expermients: [
        {   
            name: "Show Notifactions",
            details: "Sends a notifaction when you have recieved a new friend request.",
            storageKey: "showNotifactions",
            type: "toggle"
        }
    ]
}