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
    noticePrompt:   'What is present right now?\nName it honestly. No story needed.',
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
    sessionCount: n => n === 1 ? 'first session' : `${n} sessions`,
    streakLabel: n => `${n} days`,

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

    noticePrompt:   '¿Qué está presente ahora mismo?\nNómbralo honestamente. Sin historia.',
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

    sessionCount: n => n === 1 ? 'primera sesión' : `${n} sesiones`,
    streakLabel: n => `${n} días`,
  }
};

// The contractions — full 3D holding pattern
// What keeps people locked below their natural frequency
const CONTRACTIONS = {
  en: [
    // Fear cluster
    'Anxious', 'Afraid', 'Dreading', 'Panicking', 'Unsafe',
    // Overwhelm cluster
    'Overwhelmed', 'Scattered', 'Fragmented', 'Spinning', 'Flooded',
    // Contraction cluster
    'Stuck', 'Frozen', 'Paralysed', 'Trapped', 'Contracted',
    // Heaviness cluster
    'Heavy', 'Exhausted', 'Depleted', 'Defeated', 'Hopeless',
    // Separation cluster
    'Disconnected', 'Alone', 'Unseen', 'Abandoned', 'Invisible',
    // Self cluster
    'Unworthy', 'Ashamed', 'Not enough', 'Broken', 'Hollow',
    // Reactivity cluster
    'Angry', 'Resentful', 'Bitter', 'Jealous', 'Grieving',
    // Numbness cluster
    'Numb', 'Flat', 'Empty', 'Absent'
  ],
  es: [
    'Ansioso', 'Asustado', 'Temiendo', 'En pánico', 'Inseguro',
    'Agobiado', 'Disperso', 'Fragmentado', 'Girando', 'Inundado',
    'Bloqueado', 'Congelado', 'Paralizado', 'Atrapado', 'Contraído',
    'Pesado', 'Agotado', 'Vaciado', 'Derrotado', 'Sin esperanza',
    'Desconectado', 'Solo', 'Invisible', 'Abandonado', 'No visto',
    'Indigno', 'Avergonzado', 'No es suficiente', 'Roto', 'Hueco',
    'Enojado', 'Resentido', 'Amargado', 'Celoso', 'De duelo',
    'Apagado', 'Plano', 'Vacío', 'Ausente'
  ]
};

// The frequencies — what wants to be anchored
// These aren't fixes — they're genuine available states
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
    { name:'Firme',     hint:'el suelo bajo la turbulencia' },
    { name:'Abierto',   hint:'más amplio que este momento' },
    { name:'Claro',     hint:'señal a través del ruido' },
    { name:'Presente',  hint:'solo esto, solo ahora' },
    { name:'Sostenido', hint:'no estás solo en esto' },
    { name:'Espacioso', hint:'lugar para todo ello' },
    { name:'Confiando', hint:'la evidencia de tu vida' },
    { name:'Luminoso',  hint:'la luz que no depende de las circunstancias' },
  ]
};

// Polarity pairs — the complementary truth for each contraction
// AI generates bespoke ones, but these seed the practice
const POLARITY_SEEDS = {
  en: {
    // Fear cluster
    Anxious:      "And somewhere in me, there is a stillness the anxiety moves through.",
    Afraid:       "And I have met fear before, and I am still here.",
    Dreading:     "And the thing I dread has not arrived yet. Right now, I am intact.",
    Panicking:    "And my breath is still here. The body knows how to return.",
    Unsafe:       "And I have survived every unsafe moment I have ever faced.",
    // Overwhelm cluster
    Overwhelmed:  "And I have always found a way through. Every time.",
    Scattered:    "And my attention, when I choose it, is precise and clear.",
    Fragmented:   "And underneath the fragments, something in me remains whole.",
    Spinning:     "And the spinning will slow. It always does.",
    Flooded:      "And water finds its level. I know how to let things settle.",
    // Contraction cluster
    Stuck:        "And something in me already knows the next small step.",
    Frozen:       "And stillness is not the same as being stopped.",
    Paralysed:    "And even now, I am breathing. Movement is already happening.",
    Trapped:      "And I have found unexpected exits before, when I stopped forcing.",
    Contracted:   "And expansion is my natural state. Contraction is temporary.",
    // Heaviness cluster
    Heavy:        "And this weight means something matters. I am not empty.",
    Exhausted:    "And rest is not weakness. The field replenishes.",
    Depleted:     "And I have been replenished before. Restoration is real.",
    Defeated:     "And defeat is not the final word. I am still in the field.",
    Hopeless:     "And hope has returned before, from places darker than this.",
    // Separation cluster
    Disconnected: "And connection has found me before, without me forcing it.",
    Alone:        "And I have been alone before and discovered I was enough.",
    Unseen:       "And I see myself clearly. That is its own kind of witness.",
    Abandoned:    "And I have not abandoned myself, even now.",
    Invisible:    "And the field sees what others miss. I am not invisible here.",
    // Self cluster
    Unworthy:     "And I am here. I keep showing up. That is evidence.",
    Ashamed:      "And shame lives in hiding. The fact I can name it is already movement.",
    'Not enough': "And enough is not a fixed line. I have always been enough for what mattered.",
    Broken:       "And what feels broken is often what has been most deeply used.",
    Hollow:       "And hollow is not empty — it is space waiting to be filled.",
    // Reactivity cluster
    Angry:        "And beneath this anger, there is something I care about deeply.",
    Resentful:    "And resentment carries a request. Something in me wants to be met.",
    Bitter:       "And bitterness is love that has not found its form yet.",
    Jealous:      "And jealousy shows me what I genuinely want. That desire is real and valid.",
    Grieving:     "And grief is love with nowhere to go. The love is still here.",
    // Numbness cluster
    Numb:         "And the fact that I notice the numbness means I am still present.",
    Flat:         "And flatness is the field at rest before the next wave.",
    Empty:        "And empty is a beginning, not an ending.",
    Absent:       "And something in me is here enough to notice the absence.",
  },
  es: {
    Ansioso:         "Y en algún lugar en mí, hay una quietud a través de la cual se mueve la ansiedad.",
    Asustado:        "Y ya he enfrentado el miedo antes, y sigo aquí.",
    Temiendo:        "Y lo que temo aún no ha llegado. Ahora mismo, estoy intacto.",
    'En pánico':     "Y mi respiración sigue aquí. El cuerpo sabe cómo volver.",
    Inseguro:        "Y he sobrevivido cada momento de inseguridad que he enfrentado.",
    Agobiado:        "Y siempre he encontrado un camino. Cada vez.",
    Disperso:        "Y mi atención, cuando la elijo, es precisa y clara.",
    Fragmentado:     "Y bajo los fragmentos, algo en mí permanece entero.",
    Girando:         "Y el giro se ralentizará. Siempre lo hace.",
    Inundado:        "Y el agua encuentra su nivel. Sé cómo dejar que las cosas se asienten.",
    Bloqueado:       "Y algo en mí ya conoce el siguiente pequeño paso.",
    Congelado:       "Y la quietud no es lo mismo que estar detenido.",
    Paralizado:      "Y incluso ahora, estoy respirando. El movimiento ya está ocurriendo.",
    Atrapado:        "Y he encontrado salidas inesperadas antes, cuando dejé de forzar.",
    Contraído:       "Y la expansión es mi estado natural. La contracción es temporal.",
    Pesado:          "Y este peso significa que algo importa. No estoy vacío.",
    Agotado:         "Y el descanso no es debilidad. El campo se repone.",
    Vaciado:         "Y he sido repuesto antes. La restauración es real.",
    Derrotado:       "Y la derrota no es la última palabra. Sigo en el campo.",
    'Sin esperanza': "Y la esperanza ha regresado antes, desde lugares más oscuros que este.",
    Desconectado:    "Y la conexión me ha encontrado antes, sin que yo la forzara.",
    Solo:            "Y he estado solo antes y descubrí que era suficiente.",
    'No visto':      "Y me veo a mí mismo claramente. Eso es su propio tipo de testigo.",
    Abandonado:      "Y no me he abandonado a mí mismo, incluso ahora.",
    Invisible:       "Y el campo ve lo que otros pierden. No soy invisible aquí.",
    Indigno:         "Y estoy aquí. Sigo apareciendo. Eso es evidencia.",
    Avergonzado:     "Y la vergüenza vive en el ocultamiento. El hecho de que puedo nombrarlo ya es movimiento.",
    'No es suficiente': "Y suficiente no es una línea fija. Siempre he sido suficiente para lo que importaba.",
    Roto:            "Y lo que se siente roto es a menudo lo que ha sido más profundamente usado.",
    Hueco:           "Y hueco no está vacío — es espacio esperando ser llenado.",
    Enojado:         "Y debajo de este enojo, hay algo que me importa profundamente.",
    Resentido:       "Y el resentimiento lleva una petición. Algo en mí quiere ser encontrado.",
    Amargado:        "Y la amargura es amor que aún no ha encontrado su forma.",
    Celoso:          "Y los celos me muestran lo que genuinamente quiero. Ese deseo es real.",
    'De duelo':      "Y el duelo es amor sin a dónde ir. El amor sigue aquí.",
    Apagado:         "Y el hecho de que noto el entumecimiento significa que sigo presente.",
    Plano:           "Y la planitud es el campo en reposo antes de la próxima ola.",
    Vacío:           "Y vacío es un comienzo, no un final.",
    Ausente:         "Y algo en mí está lo suficientemente aquí para notar la ausencia.",
  }
};

// Witnessed — the closing reflection after a complete session
const WITNESSED = {
  en: {
    Anxious:      "Anxious was held without being fixed. That is the practice.",
    Afraid:       "Afraid was met with presence. That took courage.",
    Dreading:     "You stayed with Dreading without collapsing into it.",
    Panicking:    "Even Panicking was held. The breath was always there.",
    Unsafe:       "Unsafe was seen. And you remained.",
    Overwhelmed:  "You stayed with Overwhelmed and found the ground beneath it.",
    Scattered:    "You gathered Scattered without forcing it to cohere.",
    Fragmented:   "Fragmented was witnessed whole. That is the paradox.",
    Spinning:     "You found stillness at the centre of Spinning.",
    Flooded:      "Flooded was held until the water found its level.",
    Stuck:        "Stuck was seen. Something moved, even slightly.",
    Frozen:       "Frozen was met without being forced to thaw.",
    Paralysed:    "You breathed inside Paralysed. That is already movement.",
    Trapped:      "Trapped was held. The space around it became visible.",
    Contracted:   "Contraction was held until expansion became possible.",
    Heavy:        "You held Heavy and found you were large enough.",
    Exhausted:    "Exhausted was honoured. Rest is part of the field.",
    Depleted:     "Depleted was met honestly. Restoration has already begun.",
    Defeated:     "Defeated was held without accepting it as final.",
    Hopeless:     "Even Hopeless was brought here. That is not nothing.",
    Disconnected: "Disconnected was not avoided. Connection knows the way back.",
    Alone:        "Alone was met with presence. You were not alone in it.",
    Unseen:       "Unseen was witnessed. The field saw you clearly.",
    Abandoned:    "Abandoned was held. You did not leave yourself.",
    Invisible:    "Invisible came into the light. It was seen.",
    Unworthy:     "Unworthy was seen clearly. The evidence says otherwise.",
    Ashamed:      "Ashamed was named. Naming is the beginning of freedom.",
    'Not enough': "Not enough was held until enough became possible.",
    Broken:       "Broken was held with care. Care is how things mend.",
    Hollow:       "Hollow was met. Something is already filling it.",
    Angry:        "Angry was witnessed. The care beneath it became visible.",
    Resentful:    "Resentful was held without being fed. That is strength.",
    Bitter:       "Bitter was met with honesty. The love beneath it is real.",
    Jealous:      "Jealous was seen without judgement. The desire beneath it is valid.",
    Grieving:     "Grief was witnessed. The love that caused it is still here.",
    Numb:         "Even Numb was met. The fact of meeting it is everything.",
    Flat:         "Flat was held. The next wave is already forming.",
    Empty:        "Empty was entered. That took more courage than it looks.",
    Absent:       "Even Absent showed up. Something in you always does.",
  },
  es: {
    Ansioso:         "Ansioso fue sostenido sin ser arreglado. Eso es la práctica.",
    Asustado:        "Asustado fue encontrado con presencia. Eso requirió valentía.",
    Temiendo:        "Te quedaste con Temiendo sin colapsar en ello.",
    'En pánico':     "Incluso En pánico fue sostenido. La respiración siempre estuvo ahí.",
    Inseguro:        "Inseguro fue visto. Y permaneciste.",
    Agobiado:        "Te quedaste con Agobiado y encontraste el suelo bajo él.",
    Disperso:        "Reuniste Disperso sin forzar la coherencia.",
    Fragmentado:     "Fragmentado fue atestiguado entero. Esa es la paradoja.",
    Girando:         "Encontraste quietud en el centro de Girando.",
    Inundado:        "Inundado fue sostenido hasta que el agua encontró su nivel.",
    Bloqueado:       "Bloqueado fue visto. Algo se movió, aunque sea ligeramente.",
    Congelado:       "Congelado fue encontrado sin ser forzado a descongelarse.",
    Paralizado:      "Respiraste dentro de Paralizado. Eso ya es movimiento.",
    Atrapado:        "Atrapado fue sostenido. El espacio alrededor se hizo visible.",
    Contraído:       "La contracción fue sostenida hasta que la expansión fue posible.",
    Pesado:          "Sostuviste Pesado y descubriste que eras suficientemente grande.",
    Agotado:         "Agotado fue honrado. El descanso es parte del campo.",
    Vaciado:         "Vaciado fue encontrado honestamente. La restauración ya ha comenzado.",
    Derrotado:       "Derrotado fue sostenido sin aceptarlo como final.",
    'Sin esperanza': "Incluso Sin esperanza fue traído aquí. Eso no es nada.",
    Desconectado:    "Desconectado no fue evitado. La conexión conoce el camino de regreso.",
    Solo:            "Solo fue encontrado con presencia. No estabas solo en ello.",
    'No visto':      "No visto fue atestiguado. El campo te vio claramente.",
    Abandonado:      "Abandonado fue sostenido. No te abandonaste a ti mismo.",
    Invisible:       "Invisible salió a la luz. Fue visto.",
    Indigno:         "Indigno fue visto claramente. La evidencia dice lo contrario.",
    Avergonzado:     "Avergonzado fue nombrado. Nombrar es el comienzo de la libertad.",
    'No es suficiente': "No es suficiente fue sostenido hasta que suficiente fue posible.",
    Roto:            "Roto fue sostenido con cuidado. El cuidado es cómo las cosas sanan.",
    Hueco:           "Hueco fue encontrado. Algo ya lo está llenando.",
    Enojado:         "Enojado fue atestiguado. El cuidado debajo se hizo visible.",
    Resentido:       "Resentido fue sostenido sin ser alimentado. Eso es fortaleza.",
    Amargado:        "Amargado fue encontrado con honestidad. El amor debajo es real.",
    Celoso:          "Celoso fue visto sin juicio. El deseo debajo es válido.",
    'De duelo':      "El duelo fue atestiguado. El amor que lo causó sigue aquí.",
    Apagado:         "Incluso Apagado fue encontrado. El hecho de encontrarlo lo es todo.",
    Plano:           "Plano fue sostenido. La próxima ola ya se está formando.",
    Vacío:           "Vacío fue entrado. Eso requirió más valentía de lo que parece.",
    Ausente:         "Incluso Ausente apareció. Algo en ti siempre lo hace.",
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
