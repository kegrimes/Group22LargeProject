import React, { useState } from 'react';

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
            console.log(res)
            if( res.id <= 0 )
            {
                setMessage('User/Password combination incorrect');
            }
            else
            {
                var user = {firstname:res.firstname,lastname:res.lastname,id:res.id}
                localStorage.setItem('user_data', JSON.stringify(user));

                setMessage('');

                window.location.href = '/register';

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
      <div id="loginDiv">
        <form onSubmit={doLogin}>
        <span id="inner-title">PLEASE LOG IN</span><br />
        <input type="text" id="loginName" placeholder="Username" ref={(c) => loginName = c} /><br />
        <input type="password" id="loginPassword" placeholder="Password" ref={(c) => loginPassword = c} /><br />
        <input type="submit" id="loginButton" class="buttons" value = "Do It" onClick={doLogin} />
        </form>
        <span id="loginResult">{message}</span>
    </div>
    );
};

export default Login;
