// ═══════════════════════════════════════
// FIELD v2 — Data
// Notice · Hold · Anchor · Integrate
// ═══════════════════════════════════════

const TRANSLATIONS = {
  en: {
    // Home
    arrival: 'What are you holding right now?',
    arrivalSub: 'both things are true',

    // Phases
    noticeLabel:    'Notice',
    holdLabel:      'Hold',
    anchorLabel:    'Anchor',
    integrateLabel: 'Integrate',

    noticeHint:    'what is present',
    holdHint:      'stay without fixing',
    anchorHint:    'find the other truth',
    integrateHint: 'land in the wider place',

    // Phase prompts
    noticePrompt:   'Just notice.\nNothing to fix.\nLet it be here.',
    holdPrompt:     'Stay with it.\nFeel where it lives in your body.\nDon\'t try to change it.',
    anchorPrompt:   'What is also true?\nNot the opposite — the complement.\nSomething your lived experience confirms.',
    integratePrompt:'Hold both.\nBreathe.\nWhat becomes available from this wider place?',

    // Polarity work
    heavyEnd:       'What\'s pulling at you',
    lightEnd:       'What\'s also true',
    bothTrue:       'Both of these are true.\nYou are large enough to hold them.',

    // Thread
    threadPrompt:   'one true thing from this session',
    threadHint:     'speak it or write it',

    // Navigation
    retBtn:         'return',
    beginBtn:       'enter',
    continueBtn:    'continue →',
    skipBtn:        'skip',

    // Settings
    apiNote:        'stored locally · never transmitted',

    // Session
    sessionCount: n => n === 1 ? 'you have been here once' : `you have been here ${n} times`,
    streakLabel: n => `${n} days returning`,

    // AI system prompts are in app.js
  },
  es: {
    arrival: '¿Qué estás sosteniendo ahora mismo?',
    arrivalSub: 'las dos cosas son verdad',

    noticeLabel:    'Notar',
    holdLabel:      'Sostener',
    anchorLabel:    'Anclar',
    integrateLabel: 'Integrar',

    noticeHint:    'lo que está presente',
    holdHint:      'quedarse sin arreglar',
    anchorHint:    'encontrar la otra verdad',
    integrateHint: 'aterrizar en el lugar más amplio',

    noticePrompt:   'Solo nota.\nNada que arreglar.\nDéjalo estar aquí.',
    holdPrompt:     'Quédate con ello.\nSiente dónde vive en tu cuerpo.\nNo intentes cambiarlo.',
    anchorPrompt:   '¿Qué también es verdad?\nNo lo opuesto — el complemento.\nAlgo que tu experiencia vivida confirma.',
    integratePrompt:'Sostén ambos.\nRespira.\n¿Qué está disponible desde este lugar más amplio?',

    heavyEnd:       'Lo que te pesa',
    lightEnd:       'Lo que también es verdad',
    bothTrue:       'Las dos cosas son verdad.\nEres suficientemente grande para sostenerlas.',

    threadPrompt:   'una cosa verdadera de esta sesión',
    threadHint:     'dilo o escríbelo',

    retBtn:         'volver',
    beginBtn:       'entrar',
    continueBtn:    'continuar →',
    skipBtn:        'omitir',

    apiNote:        'guardado localmente · nunca transmitido',

    sessionCount: n => n === 1 ? 'has estado aquí una vez' : `has estado aquí ${n} veces`,
    streakLabel: n => `${n} días regresando`,
  }
};

// The contractions — full 3D holding pattern
// Felt-sense language — what people actually say at 6am
const CONTRACTIONS = {
  en: [
    // Fear cluster
    'Anxious', 'Afraid', 'Dreading', 'Panicking', 'Unsafe',
    // Overwhelm cluster
    'Overwhelmed', 'Scattered', 'Spiralling', 'Swamped', 'Restless',
    // Stuck cluster
    'Stuck', 'Frozen', 'Trapped', 'Closed off', 'Confused',
    // Heaviness cluster
    'Heavy', 'Exhausted', 'Drained', 'Defeated', 'No way out',
    // Separation cluster
    'Disconnected', 'Alone', 'Unseen', 'Left behind', 'Invisible',
    // Self cluster
    'Not enough', 'Ashamed', 'Guilty', 'Broken', 'Raw',
    // Reactivity cluster
    'Angry', 'Resentful', 'Bitter', 'Jealous', 'Grieving',
    // Numbness cluster
    'Numb', 'Flat', 'Not here', 'Lost', 'Given up', 'Pressured'
  ],
  es: [
    // Fear cluster
    'Ansioso/a', 'Con miedo', 'Temiendo', 'En pánico', 'Sin seguridad',
    // Overwhelm cluster
    'Sobrepasado/a', 'Disperso/a', 'En espiral', 'Con todo encima', 'Inquieto/a',
    // Stuck cluster
    'Atascado/a', 'Congelado/a', 'Atrapado/a', 'Cerrado/a', 'Confundido/a',
    // Heaviness cluster
    'Pesado/a', 'Agotado/a', 'Sin nada que dar', 'Derrotado/a', 'Sin salida',
    // Separation cluster
    'Desconectado/a', 'Solo/a', 'Como que nadie me ve', 'Abandonado/a', 'Invisible',
    // Self cluster
    'No soy suficiente', 'Con vergüenza', 'Con culpa', 'Roto/a', 'En carne viva',
    // Reactivity cluster
    'Enojado/a', 'Con rabia', 'Amargado/a', 'Con celos', 'De duelo',
    // Numbness cluster
    'Entumecido/a', 'Apagado/a', 'No estoy', 'Perdido/a', 'Rendido/a', 'Presionado/a'
  ]
};

// The frequencies — what wants to be anchored
const FREQUENCIES = {
  en: [
    { name:'Steady',    hint:'the ground beneath the turbulence' },
    { name:'Open',      hint:'wider than this moment' },
    { name:'Clear',     hint:'signal through the noise' },
    { name:'Present',   hint:'only this, only now' },
    { name:'Held',      hint:'you are not alone in this' },
    { name:'Spacious',  hint:'room for all of it' },
    { name:'Trusting',  hint:'the evidence of your life' },
    { name:'Luminous',  hint:'the light that doesn\'t depend on circumstances' },
  ],
  es: [
    { name:'Firme',       hint:'el suelo bajo la turbulencia' },
    { name:'Abierto/a',   hint:'más amplio que este momento' },
    { name:'Claro/a',     hint:'señal a través del ruido' },
    { name:'Presente',    hint:'solo esto, solo ahora' },
    { name:'Sostenido/a', hint:'no estás solo/a en esto' },
    { name:'Espacioso/a', hint:'lugar para todo ello' },
    { name:'Confiando',   hint:'la evidencia de tu vida' },
    { name:'Luminoso/a',  hint:'la luz que no depende de las circunstancias' },
  ]
};

// Polarity seeds — the complementary truth for each contraction
const POLARITY_SEEDS = {
  en: {
    Anxious:       "And somewhere in me, there is a stillness the anxiety moves through.",
    Afraid:        "And I have met fear before, and I am still here.",
    Dreading:      "And the thing I dread has not arrived yet. Right now, I am intact.",
    Panicking:     "And my breath is still here. The body knows how to return.",
    Unsafe:        "And I have survived every unsafe moment I have ever faced.",
    Overwhelmed:   "And I have always found a way through. Every time.",
    Scattered:     "And my attention, when I choose it, is precise and clear.",
    Spiralling:    "And the spiral will slow. It always does. I have proof.",
    Swamped:       "And water finds its level. I know how to let things settle.",
    Restless:      "And beneath the restlessness, something in me is searching. That is alive.",
    Stuck:         "And something in me already knows the next small step.",
    Frozen:        "And stillness is not the same as being stopped.",
    Trapped:       "And I have found unexpected exits before, when I stopped forcing.",
    'Closed off':  "And closing off was protection. And I am safe enough to open now.",
    Confused:      "And confusion means I am at the edge of something new. That is not failure.",
    Heavy:         "And this weight means something matters. I am not empty.",
    Exhausted:     "And rest is not weakness. The field replenishes.",
    Drained:       "And I have been refilled before. Restoration is real.",
    Defeated:      "And defeat is not the final word. I am still in the field.",
    'No way out':  "And I have found ways through before, from places that felt just like this.",
    Disconnected:  "And connection has found me before, without me forcing it.",
    Alone:         "And I have been alone before and discovered I was enough.",
    Unseen:        "And I see myself clearly. That is its own kind of witness.",
    'Left behind': "And I have not left myself behind, even now.",
    Invisible:     "And the field sees what others miss. I am not invisible here.",
    'Not enough':  "And enough is not a fixed line. I have always been enough for what mattered.",
    Ashamed:       "And shame lives in hiding. The fact I can name it is already movement.",
    Guilty:        "And guilt means I have a conscience. That is not nothing.",
    Broken:        "And what feels broken is often what has been most deeply used.",
    Raw:           "And raw means something real is close to the surface. That is aliveness.",
    Angry:         "And beneath this anger, there is something I care about deeply.",
    Resentful:     "And resentment carries a request. Something in me wants to be met.",
    Bitter:        "And bitterness is love that has not found its form yet.",
    Jealous:       "And jealousy shows me what I genuinely want. That desire is real.",
    Grieving:      "And grief is love with nowhere to go. The love is still here.",
    Numb:          "And the fact that I notice the numbness means I am still present.",
    Flat:          "And flatness is the field at rest before the next wave.",
    'Not here':    "And something in me is here enough to notice the absence.",
    Lost:          "And being lost means I am moving. I have not stopped.",
    'Given up':    "And even giving up took effort. Something in me still cares.",
    Pressured:     "And pressure means something matters enough to push. I can choose what I carry.",
  },
  es: {
    'Ansioso/a':          "Y en algún lugar en mí, hay una quietud a través de la cual se mueve la ansiedad.",
    'Con miedo':          "Y ya he enfrentado el miedo antes, y sigo aquí.",
    Temiendo:             "Y lo que temo aún no ha llegado. Ahora mismo, estoy intacto/a.",
    'En pánico':          "Y mi respiración sigue aquí. El cuerpo sabe cómo volver.",
    'Sin seguridad':      "Y he sobrevivido cada momento de inseguridad que he enfrentado.",
    'Sobrepasado/a':      "Y siempre he encontrado un camino. Cada vez.",
    'Disperso/a':         "Y mi atención, cuando la elijo, es precisa y clara.",
    'En espiral':         "Y la espiral se va a calmar. Siempre lo hace. Tengo prueba.",
    'Con todo encima':    "Y el agua encuentra su nivel. Sé cómo dejar que las cosas se asienten.",
    'Inquieto/a':         "Y bajo la inquietud, algo en mí está buscando. Eso está vivo.",
    'Atascado/a':         "Y algo en mí ya conoce el siguiente pequeño paso.",
    'Congelado/a':        "Y la quietud no es lo mismo que estar detenido/a.",
    'Atrapado/a':         "Y he encontrado salidas inesperadas antes, cuando dejé de forzar.",
    'Cerrado/a':          "Y cerrarse fue protección. Y ahora estoy lo suficientemente seguro/a para abrirme.",
    'Confundido/a':       "Y la confusión significa que estoy al borde de algo nuevo. Eso no es fracaso.",
    'Pesado/a':           "Y este peso significa que algo importa. No estoy vacío/a.",
    'Agotado/a':          "Y el descanso no es debilidad. El campo se repone.",
    'Sin nada que dar':   "Y he sido repuesto/a antes. La restauración es real.",
    'Derrotado/a':        "Y la derrota no es la última palabra. Sigo en el campo.",
    'Sin salida':         "Y he encontrado caminos antes, desde lugares que se sentían igual que este.",
    'Desconectado/a':     "Y la conexión me ha encontrado antes, sin que yo la forzara.",
    'Solo/a':             "Y he estado solo/a antes y descubrí que era suficiente.",
    'Como que nadie me ve': "Y me veo claramente. Eso es su propio tipo de testigo.",
    'Abandonado/a':       "Y no me he abandonado a mí mismo/a, incluso ahora.",
    Invisible:            "Y el campo ve lo que otros pierden. No soy invisible aquí.",
    'No soy suficiente':  "Y suficiente no es una línea fija. Siempre he sido suficiente para lo que importaba.",
    'Con vergüenza':      "Y la vergüenza vive en el ocultamiento. El hecho de que puedo nombrarla ya es movimiento.",
    'Con culpa':          "Y la culpa significa que tengo conciencia. Eso no es nada.",
    'Roto/a':             "Y lo que se siente roto es a menudo lo que ha sido más profundamente usado.",
    'En carne viva':      "Y estar en carne viva significa que algo real está cerca de la superficie. Eso es estar vivo/a.",
    'Enojado/a':          "Y debajo de este enojo, hay algo que me importa profundamente.",
    'Con rabia':          "Y la rabia lleva una petición. Algo en mí quiere ser encontrado.",
    'Amargado/a':         "Y la amargura es amor que aún no ha encontrado su forma.",
    'Con celos':          "Y los celos me muestran lo que genuinamente quiero. Ese deseo es real.",
    'De duelo':           "Y el duelo es amor sin a dónde ir. El amor sigue aquí.",
    'Entumecido/a':       "Y el hecho de que noto el entumecimiento significa que sigo presente.",
    'Apagado/a':          "Y lo apagado es el campo en reposo antes de la próxima ola.",
    'No estoy':           "Y algo en mí está lo suficientemente aquí para notar la ausencia.",
    'Perdido/a':          "Y estar perdido/a significa que me estoy moviendo. No me he detenido.",
    'Rendido/a':          "Y incluso rendirse requirió esfuerzo. Algo en mí todavía le importa.",
    'Presionado/a':       "Y la presión significa que algo importa lo suficiente. Puedo elegir lo que cargo.",
  }
};

// Witnessed — closing reflection after a complete session
const WITNESSED = {
  en: {
    Anxious:       "Anxious was held without being fixed. That is the practice.",
    Afraid:        "Afraid was met with presence. That took courage.",
    Dreading:      "You stayed with Dreading without collapsing into it.",
    Panicking:     "Even Panicking was held. The breath was always there.",
    Unsafe:        "Unsafe was seen. And you remained.",
    Overwhelmed:   "You stayed with Overwhelmed and found the ground beneath it.",
    Scattered:     "You gathered Scattered without forcing it to cohere.",
    Spiralling:    "You found stillness at the centre of Spiralling.",
    Swamped:       "Swamped was held until the water found its level.",
    Restless:      "Restless was met without being fixed. The searching was honoured.",
    Stuck:         "Stuck was seen. Something moved, even slightly.",
    Frozen:        "Frozen was met without being forced to thaw.",
    Trapped:       "Trapped was held. The space around it became visible.",
    'Closed off':  "Closed off was held gently. Something opened, just a crack.",
    Confused:      "Confused was held at the edge. That edge is where things shift.",
    Heavy:         "You held Heavy and found you were large enough.",
    Exhausted:     "Exhausted was honoured. Rest is part of the field.",
    Drained:       "Drained was met honestly. Restoration has already begun.",
    Defeated:      "Defeated was held without accepting it as final.",
    'No way out':  "Even No way out was brought here. A way was held open.",
    Disconnected:  "Disconnected was not avoided. Connection knows the way back.",
    Alone:         "Alone was met with presence. You were not alone in it.",
    Unseen:        "Unseen was witnessed. The field saw you clearly.",
    'Left behind': "Left behind was held. You did not leave yourself.",
    Invisible:     "Invisible came into the light. It was seen.",
    'Not enough':  "Not enough was held until enough became possible.",
    Ashamed:       "Ashamed was named. Naming is the beginning of freedom.",
    Guilty:        "Guilty was held with honesty. The conscience beneath it is real.",
    Broken:        "Broken was held with care. Care is how things mend.",
    Raw:           "Raw was met without armour. That is rare and real.",
    Angry:         "Angry was witnessed. The care beneath it became visible.",
    Resentful:     "Resentful was held without being fed. That is strength.",
    Bitter:        "Bitter was met with honesty. The love beneath it is real.",
    Jealous:       "Jealous was seen without judgement. The desire beneath it is valid.",
    Grieving:      "Grief was witnessed. The love that caused it is still here.",
    Numb:          "Even Numb was met. The fact of meeting it is everything.",
    Flat:          "Flat was held. The next wave is already forming.",
    'Not here':    "Even Not here showed up. Something in you always does.",
    Lost:          "Lost was held. You were not lost to yourself.",
    'Given up':    "Given up was brought here. That is not giving up.",
    Pressured:     "Pressured was held without bending to it. That is freedom.",
  },
  es: {
    'Ansioso/a':          "Ansioso/a fue sostenido/a sin ser arreglado/a. Eso es la práctica.",
    'Con miedo':          "Con miedo fue encontrado con presencia. Eso requirió valentía.",
    Temiendo:             "Te quedaste con Temiendo sin colapsar en ello.",
    'En pánico':          "Incluso En pánico fue sostenido. La respiración siempre estuvo ahí.",
    'Sin seguridad':      "Sin seguridad fue visto. Y permaneciste.",
    'Sobrepasado/a':      "Te quedaste con Sobrepasado/a y encontraste el suelo bajo ello.",
    'Disperso/a':         "Reuniste Disperso/a sin forzar la coherencia.",
    'En espiral':         "Encontraste quietud en el centro de En espiral.",
    'Con todo encima':    "Con todo encima fue sostenido hasta que el agua encontró su nivel.",
    'Inquieto/a':         "Inquieto/a fue encontrado sin ser arreglado. La búsqueda fue honrada.",
    'Atascado/a':         "Atascado/a fue visto. Algo se movió, aunque sea ligeramente.",
    'Congelado/a':        "Congelado/a fue encontrado sin ser forzado a descongelarse.",
    'Atrapado/a':         "Atrapado/a fue sostenido. El espacio alrededor se hizo visible.",
    'Cerrado/a':          "Cerrado/a fue sostenido con suavidad. Algo se abrió, solo un poco.",
    'Confundido/a':       "Confundido/a fue sostenido en el borde. Ese borde es donde las cosas cambian.",
    'Pesado/a':           "Sostuviste Pesado/a y descubriste que eras suficientemente grande.",
    'Agotado/a':          "Agotado/a fue honrado/a. El descanso es parte del campo.",
    'Sin nada que dar':   "Sin nada que dar fue encontrado honestamente. La restauración ya ha comenzado.",
    'Derrotado/a':        "Derrotado/a fue sostenido sin aceptarlo como final.",
    'Sin salida':         "Incluso Sin salida fue traído aquí. Un camino fue mantenido abierto.",
    'Desconectado/a':     "Desconectado/a no fue evitado. La conexión conoce el camino de regreso.",
    'Solo/a':             "Solo/a fue encontrado con presencia. No estabas solo/a en ello.",
    'Como que nadie me ve': "Como que nadie me ve fue atestiguado. El campo te vio claramente.",
    'Abandonado/a':       "Abandonado/a fue sostenido. No te abandonaste a ti mismo/a.",
    Invisible:            "Invisible salió a la luz. Fue visto.",
    'No soy suficiente':  "No soy suficiente fue sostenido hasta que suficiente fue posible.",
    'Con vergüenza':      "Con vergüenza fue nombrado. Nombrar es el comienzo de la libertad.",
    'Con culpa':          "Con culpa fue sostenido con honestidad. La conciencia debajo es real.",
    'Roto/a':             "Roto/a fue sostenido con cuidado. El cuidado es cómo las cosas sanan.",
    'En carne viva':      "En carne viva fue encontrado sin armadura. Eso es raro y real.",
    'Enojado/a':          "Enojado/a fue atestiguado. El cuidado debajo se hizo visible.",
    'Con rabia':          "Con rabia fue sostenido sin ser alimentado. Eso es fortaleza.",
    'Amargado/a':         "Amargado/a fue encontrado con honestidad. El amor debajo es real.",
    'Con celos':          "Con celos fue visto sin juicio. El deseo debajo es válido.",
    'De duelo':           "El duelo fue atestiguado. El amor que lo causó sigue aquí.",
    'Entumecido/a':       "Incluso Entumecido/a fue encontrado. El hecho de encontrarlo lo es todo.",
    'Apagado/a':          "Apagado/a fue sostenido. La próxima ola ya se está formando.",
    'No estoy':           "Incluso No estoy apareció. Algo en ti siempre lo hace.",
    'Perdido/a':          "Perdido/a fue sostenido. No te perdiste a ti mismo/a.",
    'Rendido/a':          "Rendido/a fue traído aquí. Eso no es rendirse.",
    'Presionado/a':       "Presionado/a fue sostenido sin doblarse. Eso es libertad.",
  }
};

// Body zones for somatic location
const BODY_ZONES = {
  en: ['head', 'throat', 'chest', 'heart', 'solar plexus', 'belly', 'pelvis'],
  es: ['cabeza', 'garganta', 'pecho', 'corazón', 'plexo solar', 'vientre', 'pelvis']
};

// Breath invitations — used during Hold and Anchor phases
const BREATH_CUES = {
  en: {
    inhale: 'breathe in — all of it',
    hold:   'hold — both things at once',
    exhale: 'release — nothing needs resolving'
  },
  es: {
    inhale: 'inhala — todo ello',
    hold:   'sostén — las dos cosas a la vez',
    exhale: 'suelta — nada necesita resolverse'
  }
};
