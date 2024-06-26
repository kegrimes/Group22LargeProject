import React, { useState } from 'react';
import {Link} from 'react-router-dom';
import './css/login.css';


function Login()
{
    var loginName;
    var loginPassword;

    const [message,setMessage] = useState('');


    const doLogin = async event => 
    {
        event.preventDefault();

        var obj = {username:loginName.value,password:loginPassword.value};
        var js = JSON.stringify(obj);

        try
        {    
            const response = await fetch(buildPath('api/login'),
                {method:'POST',body:js,headers:{'Content-Type': 'application/json'}});
            console.log(response)
            var res = JSON.parse(await response.text());
            console.log(res);
            console.log('saved_parks', res.saved_parks);
            if( res.id <= 0 )
            {
                setMessage('User/Password combination incorrect');
            }
            else
            {
                var user = {firstname:res.firstname,lastname:res.lastname,id:res.id, saved_parks:res.saved_parks}
                localStorage.setItem('user_data', JSON.stringify(user));

                setMessage('');

                window.location.href = '/landing';

            }
        }
        catch(e)
        {
            alert(e.toString());
            return;
        }    
    };

    const app_name = 'group-22-0b4387ea5ed6'
    function buildPath(route)
    {
        if (process.env.NODE_ENV === 'production') 
        {
            return 'https://' + app_name +  '.herokuapp.com/' + route;
        }
        else
        {        
            return 'http://localhost:5000/' + route;
        }
    }




    return(
    <>
      <div className= "login">
        <div className="inner-title">
            Log In Form
        </div>

        <form onSubmit={doLogin}>
            <div className="inputCont">
                 <div>
                    <span class="details">Username</span>
                 </div>
                 <input type="text" id="loginName" placeholder="Username" ref={(c) => loginName = c} required /><br />
                 <div>
                    <span class="details">Password</span>
                 </div>
                 <input type="password" id="loginPassword" placeholder="Password" ref={(c) => loginPassword = c} required /><br />
             </div>
             <div className="content">
                 <div class="logButton">
                    <input type="submit" id="loginButton" class="buttons" value = 'Log In' />
                </div>
                
                <div className= "forgotParent">
                    <div class="forgot-pass">
                        <a href="/forgot-password">Forgot Password?</a>
                    </div>
                </div>

                <div id="loginResult">{message}</div>

                <div className="parentCont">
                    <div class="new-user">
                        <p style={{color:'grey'}}>Don't have an account?</p>
                         <a href ="/register"> Sign up here!</a>
                     </div>
                </div>
            </div>
        </form>
      </div>
    </>
   );
};

export default Login;
