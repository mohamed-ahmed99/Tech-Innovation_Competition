
function App() {
  
  const testServer = async () => {
    const res = await fetch("http://localhost:5000/")
    const data  = await res.json()
    console.log(data)
  }
  testServer()

  return (
    <>
      <h1>hello world</h1>
    </>
  )
}

export default App
