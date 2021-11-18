import React, { useEffect, useState } from 'react'
import logo from './logo.svg'
import './App.css'
import init from 'wasm-webgl'

function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    init().then(wasm => {
      console.log(wasm.start());
    })
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <canvas id="canvas" height="150" width="150"></canvas>
      </header>
    </div>
  )
}

export default App
