let messagesLimit = 4;
let animationOut = 'out-left';
let emoteSize = 34;

let testIndex = 0;

let widgetCurrency = null;

let lastSuperchatSignature = '';
let lastSponsorSignature = '';
let lastSponsorGiftSignature = '';

let lastCommunityGiftSender = '';
let lastCommunityGiftTime = 0;

const processedMessageIds = new Set();
const recentPaidEvents = new Map();

if (!window.chatButtonLocks) {
    window.chatButtonLocks = {};
}

const testMessages = [
    {
        name: 'Gabriel',
        message: 'Salve chat! 😂'
    },
    {
        name: 'KirikoMain',
        message: 'só orando pra sair desse elo KKKKKKK 😭'
    },
    {
        name: 'Ana',
        message: 'essa partida tá impossível 💀'
    },
    {
        name: 'Lucio',
        message: 'KKKKKKKKKKKKKKKK 😂'
    },
    {
        name: 'Genji',
        message: 'preciso de cura! ❤️'
    }
];

window.addEventListener('onWidgetLoad', function (obj) {

    const detail = obj.detail || {};
    const fieldData = detail.fieldData || {};

    messagesLimit =
        Number(fieldData.messagesLimit) || 4;

    animationOut =
        fieldData.animationOut || 'out-left';

    emoteSize =
        Number(fieldData.emoteSize) || 34;

    emoteSize =
        Math.max(
            16,
            Math.min(80, emoteSize)
        );

    document.documentElement.style.setProperty(
        '--emote-size',
        emoteSize + 'px'
    );

    widgetCurrency =
        detail.currency || null;

    const sessionData =
        detail.session &&
        detail.session.data
            ? detail.session.data
            : {};

    const superchat =
        getLatestSuperchat(sessionData);

    lastSuperchatSignature =
        getSuperchatSignature(
            superchat,
            sessionData
        );

    const sponsor =
        sessionData['sponsor-latest'];

    lastSponsorSignature =
        createEventSignature(
            'sponsor',
            sponsor
        );

    const sponsorGift =
        sessionData[
            'sponsor-gifted-latest'
        ];

    lastSponsorGiftSignature =
        createEventSignature(
            'sponsor-gift',
            sponsorGift
        );
});

window.addEventListener(
    'onEventReceived',
    function (obj) {

        const detail =
            obj.detail || {};

        const event =
            detail.event || {};

        const listener =
            detail.listener ||
            event.listener ||
            '';

        if (
            listener === 'widget-button' ||
            event.listener === 'widget-button'
        ) {
            handleWidgetButton(event);
            return;
        }

        switch (listener) {

            case 'message':
                handleChatMessage(event);
                break;

            case 'delete-message':
                handleDeleteMessage(event);
                break;

            case 'delete-messages':
                handleDeleteMessages(event);
                break;

            case 'subscriber-latest':
                handleSubscriberEvent(event);
                break;

            case 'cheer-latest':
                handleCheerEvent(event);
                break;

            case 'tip-latest':
                handleTipEvent(event);
                break;

            case 'raid-latest':
                handleRaidEvent(event);
                break;

            case 'follower-latest':
                break;

            case 'host-latest':
                break;

            default:
                break;
        }
    }
);

window.addEventListener(
    'onSessionUpdate',
    function (obj) {

        const detail =
            obj.detail || {};

        const session =
            detail.session || {};

        handleSuperchatSession(
            session
        );

        handleYouTubeMembershipSession(
            session
        );
    }
);

function handleWidgetButton(event) {

    const field =
        event.field || '';

    if (!field) {
        return;
    }

    const now =
        Date.now();

    const lastClick =
        window.chatButtonLocks[field] || 0;

    if (
        now - lastClick < 1000
    ) {
        return;
    }

    window.chatButtonLocks[field] =
        now;

    if (field === 'testMessage') {

        const test =
            testMessages[testIndex];

        addMessage(
            test.name,
            test.message,
            {
                msgId:
                    'test-' +
                    Date.now(),

                userId:
                    'test-user'
            }
        );

        testIndex++;

        if (
            testIndex >=
            testMessages.length
        ) {
            testIndex = 0;
        }

        return;
    }

    if (field === 'testEmote') {

        addTestEmoteMessage();

        return;
    }

    if (field === 'testSuperchat') {

        addSuperchat(
            'Gabriel',
            'R$ 20,00',
            'Esse é um Super Chat de teste! ✨'
        );

        return;
    }

    if (field === 'testSuperSticker') {

        addSuperSticker(
            'Gabriel',
            'R$ 10,00',
            'SUPER STICKER · personagem comemorando'
        );

        return;
    }
}

function handleChatMessage(event) {

    const data =
        event.data || {};

    const msgId =
        getMessageId(data);

    if (
        msgId &&
        processedMessageIds.has(
            String(msgId)
        )
    ) {
        return;
    }

    if (msgId) {

        rememberMessageId(
            String(msgId)
        );
    }

    const youtubeType =
        data.snippet &&
        data.snippet.type
            ? data.snippet.type
            : '';

    if (
        youtubeType ===
        'superChatEvent'
    ) {

        handleYouTubeSuperChatMessage(
            data
        );

        return;
    }

    if (
        youtubeType ===
        'superStickerEvent'
    ) {

        handleYouTubeSuperStickerMessage(
            data
        );

        return;
    }

    if (
        youtubeType &&
        youtubeType !==
            'textMessageEvent' &&
        youtubeType !==
            'memberMilestoneChatEvent'
    ) {
        return;
    }

    const username =
        getChatUsername(data);

    const message =
        getChatText(data);

    const messageFragment =
        buildMessageFragment(
            event,
            data,
            message
        );

    if (
        !message &&
        messageFragment.childNodes.length === 0
    ) {
        return;
    }

    addMessage(
        username,
        message,
        {
            msgId:
                msgId,

            userId:
                getUserId(data),

            messageFragment:
                messageFragment
        }
    );
}

function handleYouTubeSuperChatMessage(
    data
) {

    const snippet =
        data.snippet || {};

    const details =
        snippet.superChatDetails || {};

    const username =
        getChatUsername(data);

    const amount =
        getYouTubePaidAmount(
            details
        );

    const message =
        details.userComment ||
        snippet.displayMessage ||
        '';

    markRecentPaidEvent(
        username,
        amount
    );

    addSuperchat(
        username,
        amount,
        message
    );
}

function handleYouTubeSuperStickerMessage(
    data
) {

    const snippet =
        data.snippet || {};

    const details =
        snippet.superStickerDetails || {};

    const metadata =
        details.superStickerMetadata || {};

    const username =
        getChatUsername(data);

    const amount =
        getYouTubePaidAmount(
            details
        );

    const altText =
        metadata.altText ||
        'Super Sticker';

    markRecentPaidEvent(
        username,
        amount
    );

    addSuperSticker(
        username,
        amount,
        'SUPER STICKER · ' +
        altText
    );
}

function getYouTubePaidAmount(
    details
) {

    if (
        details.amountDisplayString
    ) {
        return String(
            details.amountDisplayString
        );
    }

    if (
        details.amountMicros !==
        undefined
    ) {

        const amount =
            Number(
                details.amountMicros
            ) / 1000000;

        return formatMoney(
            amount,
            {
                currency:
                    details.currency
            }
        );
    }

    return '';
}

function getChatUsername(data) {

    if (
        data.authorDetails &&
        data.authorDetails.displayName
    ) {
        return data.authorDetails.displayName;
    }

    if (data.displayName) {
        return data.displayName;
    }

    if (data.nick) {
        return data.nick;
    }

    if (data.name) {
        return data.name;
    }

    if (
        data.sender &&
        data.sender.username
    ) {
        return data.sender.username;
    }

    if (
        data.sender &&
        data.sender.displayName
    ) {
        return data.sender.displayName;
    }

    return 'Usuário';
}

function getChatText(data) {

    if (
        typeof data.text ===
        'string'
    ) {
        return data.text;
    }

    if (
        typeof data.message ===
        'string'
    ) {
        return data.message;
    }

    if (
        data.snippet &&
        typeof
        data.snippet.displayMessage ===
        'string'
    ) {
        return data.snippet.displayMessage;
    }

    if (
        data.snippet &&
        data.snippet.textMessageDetails &&
        typeof
        data.snippet
            .textMessageDetails
            .messageText ===
        'string'
    ) {
        return data.snippet
            .textMessageDetails
            .messageText;
    }

    if (
        data.snippet &&
        data.snippet
            .memberMilestoneChatDetails &&
        typeof
        data.snippet
            .memberMilestoneChatDetails
            .userComment ===
        'string'
    ) {
        return data.snippet
            .memberMilestoneChatDetails
            .userComment;
    }

    if (
        typeof data.content ===
        'string'
    ) {
        return data.content;
    }

    return '';
}

function getMessageId(data) {

    return (
        data.msgId ||
        data.id ||
        data.message_id ||
        (
            data.tags &&
            data.tags.id
        ) ||
        ''
    );
}

function getUserId(data) {

    return (
        data.userId ||
        (
            data.tags &&
            data.tags['user-id']
        ) ||
        (
            data.authorDetails &&
            data.authorDetails.channelId
        ) ||
        (
            data.sender &&
            data.sender.user_id
        ) ||
        ''
    );
}

function buildMessageFragment(
    event,
    data,
    plainText
) {

    const renderedText =
        (
            typeof event.renderedText ===
            'string'
        )
            ? event.renderedText
            :
        (
            typeof data.renderedText ===
            'string'
        )
            ? data.renderedText
            : '';

    if (
        renderedText &&
        renderedText.includes('<img')
    ) {

        const renderedFragment =
            sanitizeRenderedMessage(
                renderedText
            );

        if (
            renderedFragment
                .childNodes
                .length > 0
        ) {
            return renderedFragment;
        }
    }

    if (
        Array.isArray(
            data.emotes
        ) &&
        data.emotes.length > 0
    ) {

        return buildTwitchEmoteMessage(
            plainText,
            data.emotes
        );
    }

    const fragment =
        document.createDocumentFragment();

    if (plainText) {

        fragment.appendChild(
            document.createTextNode(
                plainText
            )
        );
    }

    return fragment;
}

function buildTwitchEmoteMessage(
    text,
    emotes
) {

    const fragment =
        document.createDocumentFragment();

    if (!text) {
        return fragment;
    }

    const validEmotes =
        emotes
            .filter(function (emote) {

                return (
                    emote &&
                    Number.isFinite(
                        Number(
                            emote.start
                        )
                    ) &&
                    Number.isFinite(
                        Number(
                            emote.end
                        )
                    )
                );
            })
            .sort(function (a, b) {

                return (
                    Number(a.start) -
                    Number(b.start)
                );
            });

    let cursor = 0;

    validEmotes.forEach(
        function (emote) {

            const start =
                Number(
                    emote.start
                );

            const end =
                Number(
                    emote.end
                );

            if (
                start < cursor ||
                start < 0 ||
                end < start
            ) {
                return;
            }

            if (
                start >
                text.length
            ) {
                return;
            }

            const before =
                text.slice(
                    cursor,
                    start
                );

            if (before) {

                fragment.appendChild(
                    document.createTextNode(
                        before
                    )
                );
            }

            const url =
                getEmoteUrl(
                    emote
                );

            if (url) {

                const image =
                    createEmoteImage(
                        url,
                        emote.name || ''
                    );

                fragment.appendChild(
                    image
                );

            } else {

                const fallback =
                    text.slice(
                        start,
                        end + 1
                    );

                fragment.appendChild(
                    document.createTextNode(
                        fallback
                    )
                );
            }

            cursor =
                end + 1;
        }
    );

    if (
        cursor <
        text.length
    ) {

        fragment.appendChild(
            document.createTextNode(
                text.slice(cursor)
            )
        );
    }

    return fragment;
}

function getEmoteUrl(emote) {

    if (
        !emote ||
        !emote.urls
    ) {
        return '';
    }

    return (
        emote.urls['2'] ||
        emote.urls['1'] ||
        emote.urls['4'] ||
        ''
    );
}

function createEmoteImage(
    url,
    altText
) {

    const image =
        document.createElement(
            'img'
        );

    image.className =
        'chat-emote';

    image.src =
        url;

    image.alt =
        altText || 'emote';

    image.title =
        altText || '';

    return image;
}

function sanitizeRenderedMessage(
    html
) {

    const fragment =
        document.createDocumentFragment();

    const parser =
        new DOMParser();

    const doc =
        parser.parseFromString(
            '<div>' +
            html +
            '</div>',
            'text/html'
        );

    const root =
        doc.body.firstElementChild;

    if (!root) {
        return fragment;
    }

    copySafeNodes(
        root,
        fragment
    );

    return fragment;
}

function copySafeNodes(
    source,
    destination
) {

    source.childNodes.forEach(
        function (node) {

            if (
                node.nodeType ===
                Node.TEXT_NODE
            ) {

                destination.appendChild(
                    document.createTextNode(
                        node.textContent || ''
                    )
                );

                return;
            }

            if (
                node.nodeType !==
                Node.ELEMENT_NODE
            ) {
                return;
            }

            const tag =
                node.tagName
                    .toUpperCase();

            if (tag === 'IMG') {

                const src =
                    node.getAttribute(
                        'src'
                    ) || '';

                if (
                    isSafeImageUrl(src)
                ) {

                    const image =
                        createEmoteImage(
                            src,
                            node.getAttribute(
                                'title'
                            ) ||
                            node.getAttribute(
                                'alt'
                            ) ||
                            ''
                        );

                    destination.appendChild(
                        image
                    );
                }

                return;
            }

            if (tag === 'BR') {

                destination.appendChild(
                    document.createElement(
                        'br'
                    )
                );

                return;
            }

            copySafeNodes(
                node,
                destination
            );
        }
    );
}

function isSafeImageUrl(url) {

    try {

        const parsed =
            new URL(
                url,
                window.location.href
            );

        return (
            parsed.protocol ===
            'https:'
        );

    } catch (error) {

        return false;
    }
}

function addTestEmoteMessage() {

    const fragment =
        document.createDocumentFragment();

    fragment.appendChild(
        document.createTextNode(
            'Teste de emote '
        )
    );

    fragment.appendChild(
        createEmoteImage(
            'https://static-cdn.jtvnw.net/emoticons/v1/25/2.0',
            'Kappa'
        )
    );

    fragment.appendChild(
        document.createTextNode(
            ' funcionando 😂'
        )
    );

    createChatMessage({
        username:
            'Gabriel',

        message:
            'Teste de emote',

        messageFragment:
            fragment,

        type:
            'normal'
    });
}

function handleSubscriberEvent(
    event
) {

    const name =
        event.name ||
        'Usuário';

    const sender =
        event.sender ||
        '';

    const amount =
        Number(
            event.amount
        ) || 1;

    if (event.bulkGifted) {

        lastCommunityGiftSender =
            sender || name;

        lastCommunityGiftTime =
            Date.now();

        const plural =
            amount === 1
                ? 'inscrição'
                : 'inscrições';

        addActivityMessage(
            sender || name,
            'presenteou ' +
            amount +
            ' ' +
            plural +
            ' para a comunidade!'
        );

        return;
    }

    if (
        event.isCommunityGift ||
        event.playedAsCommunityGift
    ) {

        const sameGiftTrain =
            sender &&
            sender ===
                lastCommunityGiftSender &&
            Date.now() -
                lastCommunityGiftTime <
                10000;

        if (sameGiftTrain) {
            return;
        }
    }

    if (event.gifted) {

        if (sender) {

            addActivityMessage(
                sender,
                'presenteou ' +
                name +
                ' com uma inscrição!'
            );

        } else {

            addActivityMessage(
                name,
                'recebeu uma inscrição de presente!'
            );
        }

        return;
    }

    const attachedMessage =
        event.message ||
        '';

    if (attachedMessage) {

        addActivityMessage(
            name,
            attachedMessage
        );

    } else {

        addActivityMessage(
            name,
            'nova inscrição no canal!'
        );
    }
}

function handleCheerEvent(event) {

    const name =
        event.name ||
        'Usuário';

    const amount =
        Number(event.amount) || 0;

    const attachedMessage =
        event.message ||
        '';

    let text =
        amount +
        (
            amount === 1
                ? ' Bit'
                : ' Bits'
        );

    if (attachedMessage) {

        text +=
            ' — ' +
            attachedMessage;
    }

    addActivityMessage(
        name,
        text
    );
}

function handleTipEvent(event) {

    const name =
        event.name ||
        'Usuário';

    const amount =
        formatMoney(
            event.amount,
            event
        );

    const attachedMessage =
        event.message ||
        '';

    let text =
        'enviou ' +
        amount;

    if (attachedMessage) {

        text +=
            ' — ' +
            attachedMessage;
    }

    addActivityMessage(
        name,
        text
    );
}

function handleRaidEvent(event) {

    const name =
        event.name ||
        'Usuário';

    const amount =
        Number(event.amount) || 0;

    if (amount > 0) {

        addActivityMessage(
            name,
            'chegou com uma raid de ' +
            amount +
            ' pessoas!'
        );

    } else {

        addActivityMessage(
            name,
            'chegou com uma raid!'
        );
    }
}

function handleDeleteMessage(event) {

    const msgId =
        event.msgId ||
        event.id ||
        '';

    if (!msgId) {
        return;
    }

    const messages =
        document.querySelectorAll(
            '.chat-message'
        );

    messages.forEach(
        function (element) {

            if (
                element.dataset.msgid ===
                String(msgId)
            ) {
                element.remove();
            }
        }
    );
}

function handleDeleteMessages(event) {

    const userId =
        event.userId ||
        '';

    if (!userId) {
        return;
    }

    const messages =
        document.querySelectorAll(
            '.chat-message'
        );

    messages.forEach(
        function (element) {

            if (
                element.dataset.userid ===
                String(userId)
            ) {
                element.remove();
            }
        }
    );
}

function handleSuperchatSession(
    session
) {

    const superchat =
        getLatestSuperchat(
            session
        );

    if (!superchat) {
        return;
    }

    const signature =
        getSuperchatSignature(
            superchat,
            session
        );

    if (
        !signature ||
        signature ===
            lastSuperchatSignature
    ) {
        return;
    }

    lastSuperchatSignature =
        signature;

    const username =
        superchat.name ||
        'Usuário';

    const value =
        formatMoney(
            superchat.amount,
            superchat
        );

    if (
        wasPaidEventRecently(
            username,
            value
        )
    ) {
        return;
    }

    const message =
        superchat.message ||
        superchat.comment ||
        '';

    addSuperchat(
        username,
        value,
        message
    );
}

function markRecentPaidEvent(
    username,
    value
) {

    cleanupRecentPaidEvents();

    const key =
        username +
        '|' +
        value;

    recentPaidEvents.set(
        key,
        Date.now()
    );
}

function wasPaidEventRecently(
    username,
    value
) {

    cleanupRecentPaidEvents();

    const key =
        username +
        '|' +
        value;

    const timestamp =
        recentPaidEvents.get(
            key
        );

    if (!timestamp) {
        return false;
    }

    return (
        Date.now() -
        timestamp <
        4000
    );
}

function cleanupRecentPaidEvents() {

    const now =
        Date.now();

    recentPaidEvents.forEach(
        function (
            timestamp,
            key
        ) {

            if (
                now -
                timestamp >
                10000
            ) {
                recentPaidEvents.delete(
                    key
                );
            }
        }
    );
}

function handleYouTubeMembershipSession(
    session
) {

    const sponsorGift =
        session[
            'sponsor-gifted-latest'
        ];

    const sponsorGiftSignature =
        createEventSignature(
            'sponsor-gift',
            sponsorGift
        );

    let giftChanged =
        false;

    if (
        sponsorGift &&
        sponsorGiftSignature &&
        sponsorGiftSignature !==
            lastSponsorGiftSignature
    ) {

        giftChanged =
            true;

        lastSponsorGiftSignature =
            sponsorGiftSignature;

        handleYouTubeMemberGift(
            sponsorGift
        );
    }

    const sponsor =
        session[
            'sponsor-latest'
        ];

    const sponsorSignature =
        createEventSignature(
            'sponsor',
            sponsor
        );

    if (
        sponsor &&
        sponsorSignature &&
        sponsorSignature !==
            lastSponsorSignature
    ) {

        lastSponsorSignature =
            sponsorSignature;

        if (!giftChanged) {

            handleYouTubeMember(
                sponsor
            );
        }
    }
}

function handleYouTubeMember(
    event
) {

    const name =
        event.name ||
        'Usuário';

    const message =
        event.message ||
        'virou membro do canal!';

    addActivityMessage(
        name,
        message
    );
}

function handleYouTubeMemberGift(
    event
) {

    const recipient =
        event.name ||
        '';

    const sender =
        event.sender ||
        'Usuário';

    const amount =
        Number(event.amount) || 1;

    const customMessage =
        event.message ||
        '';

    let text = '';

    if (amount > 1) {

        text =
            'presenteou ' +
            amount +
            ' membros para a comunidade!';

    } else if (recipient) {

        text =
            'presenteou ' +
            recipient +
            ' com uma assinatura de membro!';

    } else {

        text =
            'presenteou uma assinatura de membro!';
    }

    if (customMessage) {

        text +=
            ' — ' +
            customMessage;
    }

    addActivityMessage(
        sender,
        text
    );
}

function getLatestSuperchat(
    session
) {

    if (
        session[
            'superchat-latest'
        ]
    ) {
        return session[
            'superchat-latest'
        ];
    }

    const recent =
        session[
            'superchat-recent'
        ];

    if (
        Array.isArray(recent) &&
        recent.length > 0
    ) {
        return recent[0];
    }

    return null;
}

function getSuperchatSignature(
    superchat,
    session
) {

    if (!superchat) {
        return '';
    }

    const base =
        createEventSignature(
            'superchat',
            superchat
        );

    const countData =
        session[
            'superchat-count'
        ];

    const count =
        countData &&
        countData.count !==
            undefined
            ? countData.count
            : '';

    return (
        base +
        '|count:' +
        count
    );
}

function createEventSignature(
    prefix,
    event
) {

    if (!event) {
        return '';
    }

    const uniqueId =
        event.$hashKey ||
        event.id ||
        event._id ||
        event.createdAt ||
        event.time ||
        '';

    if (uniqueId) {

        return (
            prefix +
            '|' +
            uniqueId
        );
    }

    return [
        prefix,
        event.name || '',
        event.sender || '',
        event.amount ?? '',
        event.message || '',
        event.tier || ''
    ].join('|');
}

function formatMoney(
    amount,
    event
) {

    if (
        event &&
        event.formattedAmount
    ) {
        return String(
            event.formattedAmount
        );
    }

    if (
        typeof amount ===
        'string'
    ) {

        const trimmed =
            amount.trim();

        if (
            /[R$€£¥]/.test(
                trimmed
            )
        ) {
            return trimmed;
        }
    }

    const numericAmount =
        Number(amount);

    if (
        Number.isNaN(
            numericAmount
        )
    ) {

        return (
            amount !== undefined
                ? String(amount)
                : ''
        );
    }

    const eventCurrencyCode =
        event &&
        (
            event.currency ||
            event.currencyCode
        );

    if (eventCurrencyCode) {

        try {

            return new Intl.NumberFormat(
                'pt-BR',
                {
                    style: 'currency',
                    currency:
                        eventCurrencyCode
                }
            ).format(
                numericAmount
            );

        } catch (error) {
        }
    }

    if (
        widgetCurrency &&
        widgetCurrency.code
    ) {

        try {

            return new Intl.NumberFormat(
                'pt-BR',
                {
                    style: 'currency',
                    currency:
                        widgetCurrency.code
                }
            ).format(
                numericAmount
            );

        } catch (error) {
        }
    }

    if (
        widgetCurrency &&
        widgetCurrency.symbol
    ) {

        return (
            widgetCurrency.symbol +
            ' ' +
            numericAmount
                .toFixed(2)
                .replace('.', ',')
        );
    }

    return numericAmount
        .toFixed(2)
        .replace('.', ',');
}

function addActivityMessage(
    username,
    message
) {

    createChatMessage({
        username: username,
        message: message,
        type: 'normal'
    });
}

function addMessage(
    username,
    message,
    metadata
) {

    createChatMessage({
        username:
            username,

        message:
            message,

        messageFragment:
            metadata &&
            metadata.messageFragment
                ? metadata.messageFragment
                : null,

        type:
            'normal',

        msgId:
            metadata &&
            metadata.msgId
                ? metadata.msgId
                : '',

        userId:
            metadata &&
            metadata.userId
                ? metadata.userId
                : ''
    });
}

function addSuperchat(
    username,
    value,
    message
) {

    createChatMessage({
        username:
            username,

        value:
            value,

        message:
            message,

        type:
            'superchat'
    });
}

function addSuperSticker(
    username,
    value,
    message
) {

    createChatMessage({
        username:
            username,

        value:
            value,

        message:
            message,

        type:
            'supersticker'
    });
}

function createChatMessage(data) {

    const container =
        document.getElementById(
            'chat-container'
        );

    if (!container) {
        return;
    }

    const chatMessage =
        document.createElement(
            'div'
        );

    chatMessage.className =
        'chat-message';

    if (data.msgId) {

        chatMessage.dataset.msgid =
            String(
                data.msgId
            );
    }

    if (data.userId) {

        chatMessage.dataset.userid =
            String(
                data.userId
            );
    }

    if (
        data.type ===
        'superchat'
    ) {

        chatMessage.classList.add(
            'superchat'
        );
    }

    if (
        data.type ===
        'supersticker'
    ) {

        chatMessage.classList.add(
            'superchat'
        );

        chatMessage.classList.add(
            'supersticker'
        );
    }

    const nameElement =
        document.createElement(
            'div'
        );

    nameElement.className =
        'chat-name';

    const titleLeft =
        document.createElement(
            'div'
        );

    titleLeft.className =
        'chat-title-left';

    const usernameElement =
        document.createElement(
            'span'
        );

    usernameElement.className =
        'chat-username';

    usernameElement.textContent =
        data.username ||
        'Usuário';

    titleLeft.appendChild(
        usernameElement
    );

    if (
        (
            data.type ===
            'superchat' ||
            data.type ===
            'supersticker'
        ) &&
        data.value
    ) {

        const valueElement =
            document.createElement(
                'span'
            );

        valueElement.className =
            'superchat-value';

        valueElement.textContent =
            data.value;

        titleLeft.appendChild(
            valueElement
        );
    }

    const windowButtons =
        createWindowButtons();

    nameElement.appendChild(
        titleLeft
    );

    nameElement.appendChild(
        windowButtons
    );

    const textElement =
        document.createElement(
            'div'
        );

    textElement.className =
        'chat-text';

    const messageContent =
        document.createElement(
            'div'
        );

    messageContent.className =
        'chat-message-content';

    if (
        data.messageFragment
    ) {

        messageContent.appendChild(
            data.messageFragment
        );

    } else {

        messageContent.textContent =
            data.message || '';
    }

    textElement.appendChild(
        messageContent
    );

    chatMessage.appendChild(
        nameElement
    );

    chatMessage.appendChild(
        textElement
    );

    container.appendChild(
        chatMessage
    );

    checkMessageLimit();
}

function createWindowButtons() {

    const windowButtons =
        document.createElement(
            'div'
        );

    windowButtons.className =
        'window-buttons';

    const symbols =
        ['−', '□', '×'];

    symbols.forEach(
        function (symbol) {

            const button =
                document.createElement(
                    'span'
                );

            button.className =
                'window-button';

            button.textContent =
                symbol;

            windowButtons.appendChild(
                button
            );
        }
    );

    return windowButtons;
}

function checkMessageLimit() {

    const container =
        document.getElementById(
            'chat-container'
        );

    if (!container) {
        return;
    }

    const messages =
        container.querySelectorAll(
            '.chat-message:not(.removing)'
        );

    const extraMessages =
        messages.length -
        messagesLimit;

    if (
        extraMessages <= 0
    ) {
        return;
    }

    for (
        let i = 0;
        i < extraMessages;
        i++
    ) {

        removeMessage(
            messages[i]
        );
    }
}

function removeMessage(element) {

    if (!element) {
        return;
    }

    if (
        element.classList.contains(
            'removing'
        )
    ) {
        return;
    }

    element.classList.add(
        'removing'
    );

    if (
        animationOut ===
        'out-none'
    ) {

        element.remove();

        return;
    }

    element.classList.add(
        animationOut
    );

    setTimeout(
        function () {

            if (
                element.parentNode
            ) {

                element.parentNode
                    .removeChild(
                        element
                    );
            }

        },
        500
    );
}

function rememberMessageId(id) {

    processedMessageIds.add(
        id
    );

    if (
        processedMessageIds.size >
        200
    ) {

        const first =
            processedMessageIds
                .values()
                .next()
                .value;

        processedMessageIds.delete(
            first
        );
    }
}