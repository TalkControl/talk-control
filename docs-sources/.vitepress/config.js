export default {
    title: 'TalkControl',
    description: 'TalkControl documentation',
    // Le site est servi en project page GitHub Pages (…github.io/talk-control/) —
    // sans ce base, les assets sont référencés à la racine du domaine et 404ent.
    base: '/talk-control/',
    ignoreDeadLinks: 'localhostLinks',
    themeConfig: {
        nav: [
            { text: 'User guide', link: '/users/' },
            { text: 'Developer guide', link: '/developers/' },
            { text: 'JsDoc', link: '/developers/code/' },
        ],
        sidebar: {
            '/users/': [{ text: 'User Guide', link: '/users/' }],
            '/developers/': [{ text: 'Developer Guide', link: '/developers/' }],
        },
        editLink: {
            pattern: 'https://github.com/TalkControl/talk-control/edit/develop/docs-sources/:path',
        },
        sidebarMenuLabel: 'Menu',
    },
}
