
let noteCount = 0
let currentSense = null

function show(screen){
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'))
 document.getElementById(screen).classList.add('active')
}

function goHome(){ show('home') }

function openObserve(){ show('observe') }

function openCollapse(){ show('collapse') }

function openDecohere(){ show('decohere') }

function openNoting(){ show('noting') }

function startObserve(mode){
 alert("Observe mode: " + mode)
}

function selectSense(s){
 currentSense = s
}

function selectTone(t){
 if(currentSense){
   noteCount++
   document.getElementById("noteCount").innerText = noteCount
   currentSense = null
 }
}

function collapseState(state){
 document.getElementById("collapseRitual").classList.remove("hidden")
 document.getElementById("stateWord").innerText = state
}

function chooseBurden(b){
 document.getElementById("bodyMap").classList.remove("hidden")
 document.getElementById("releaseText").innerText = "What was " + b.toLowerCase() + " has passed."
}

function release(){
 document.getElementById("releaseResult").classList.remove("hidden")
}
