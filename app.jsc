
const canvas=document.getElementById("field")
const ctx=canvas.getContext("2d")

const subtitle=document.getElementById("subtitle")
const meter=document.getElementById("meter")
const reflection=document.getElementById("reflection")
const aiReflection=document.getElementById("aiReflection")

const gear=document.getElementById("gear")
const settings=document.getElementById("settings")
const apiInput=document.getElementById("apiKeyInput")
const saveKey=document.getElementById("saveKey")
const clearKey=document.getElementById("clearKey")

gear.onclick=()=>settings.classList.toggle("hidden")

saveKey.onclick=()=>{
localStorage.setItem("field_ai_key",apiInput.value)
settings.classList.add("hidden")
}

clearKey.onclick=()=>{
localStorage.removeItem("field_ai_key")
apiInput.value=""
}

let width,height

function resize(){
width=canvas.width=window.innerWidth
height=canvas.height=window.innerHeight
}
window.addEventListener("resize",resize)
resize()

class Particle{
constructor(){
this.x=Math.random()*width
this.y=Math.random()*height
this.vx=(Math.random()-0.5)*0.2
this.vy=(Math.random()-0.5)*0.2
this.size=Math.random()*1.5+0.4
}
update(){
this.x+=this.vx
this.y+=this.vy
if(this.x<0)this.x=width
if(this.x>width)this.x=0
if(this.y<0)this.y=height
if(this.y>height)this.y=0
}
draw(){
ctx.beginPath()
ctx.fillStyle="rgba(240,204,136,.7)"
ctx.arc(this.x,this.y,this.size,0,Math.PI*2)
ctx.fill()
}
}

const particles=[]
for(let i=0;i<70;i++)particles.push(new Particle())

const STATES={
FIELD:"field",
OBSERVE:"observe",
REFLECT:"reflect",
REST:"rest"
}

let state=STATES.FIELD
let timer=null

function startObserve(){

state=STATES.OBSERVE
subtitle.textContent="observe"
reflection.textContent=""
aiReflection.textContent=""
meter.innerHTML=""

let dots=10
let count=0

for(let i=0;i<dots;i++){
let d=document.createElement("div")
d.className="dot"
meter.appendChild(d)
}

timer=setInterval(()=>{

count++
meter.children[count-1].classList.add("on")

if(count>=dots){
clearInterval(timer)
startReflect()
}

},1000)
}

function startReflect(){

state=STATES.REFLECT
subtitle.textContent="reflect"
reflection.textContent="notice what is present"

}

async function runAI(){

let key=localStorage.getItem("field_ai_key")
if(!key)return

aiReflection.textContent="reflecting..."

try{

let r=await fetch("https://api.openai.com/v1/chat/completions",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":"Bearer "+key
},
body:JSON.stringify({
model:"gpt-4.1-mini",
messages:[
{role:"system",content:"Respond with one contemplative reflection."},
{role:"user",content:"User completed a contemplative pause."}
],
max_tokens:40
})
})

let data=await r.json()
aiReflection.textContent=data.choices?.[0]?.message?.content||""

}catch(e){
aiReflection.textContent="AI unavailable"
}

}

function handleTap(){

if(state===STATES.FIELD){
startObserve()
return
}

if(state===STATES.REFLECT){

runAI()
state=STATES.REST
subtitle.textContent="rest in the field"
return
}

if(state===STATES.REST){

state=STATES.FIELD
subtitle.textContent="enter the field"
meter.innerHTML=""
reflection.textContent=""
aiReflection.textContent=""
}

}

document.addEventListener("touchstart",handleTap)
document.addEventListener("mousedown",handleTap)

function animate(){

requestAnimationFrame(animate)

ctx.fillStyle="rgba(10,8,5,0.35)"
ctx.fillRect(0,0,width,height)

for(let p of particles){
p.update()
p.draw()
}

}

animate()
