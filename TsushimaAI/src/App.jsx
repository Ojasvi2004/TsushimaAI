import React, { useContext, useState } from 'react';
import {Route,Router,Routes,BrowserRouter} from 'react-router-dom';
import HomePage from './pages/HomePage';
import './index.css';
import HomeFooter from './components/Footer';
import NavbarBeforeLogin from './components/NavBarBeforeLogin';
import LoginPage from './pages/LoginPage';
import { AuthContext } from './context/AuthContext';
import RequestAccessPage from './pages/RequestAccessPage';
import DashboardPage from './pages/Dashboard';
import NavbarAfterLogin from './components/NavBarAfterLogin';
import NewPersonaPage from './pages/NewPersona';
import NewVoiceAgentPage from './pages/NewPersona';
import MyAgentsPage from './pages/MyAgents';
import PrebuiltLibraryPage from './pages/PreBuiltLibrary';
import StudioPage from './pages/Studio';

function App() {
  const [count, setCount] = useState(0)

  const {token,settoken}=useContext(AuthContext);

  return (
    <>
    {
      token?
      <NavbarAfterLogin/>
      :
      <NavbarBeforeLogin/>
     }
   <Routes>
     <Route path='/' element={<HomePage/>} ></Route>
     <Route path='/login' element={<LoginPage/>}></Route>
     <Route path='/request-access' element={<RequestAccessPage/>}></Route>
     <Route path='/dashboard' element={<DashboardPage/>}></Route>
     <Route path='/studio/new' element={<NewVoiceAgentPage/>}></Route>
     <Route path='/agents' element={<MyAgentsPage/>}></Route>
     <Route path='/prebuilt' element={<PrebuiltLibraryPage/>}></Route>
     <Route path='/studio' element={<StudioPage/>}></Route>
   </Routes>
   <HomeFooter/>


    </>
  )
}

export default App
