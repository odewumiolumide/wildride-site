/*global WildRydes _config AmazonCognitoIdentity AWSCognito*/

var WildRydes = window.WildRydes || {};

(function scopeWrapper($) {
    var signinUrl = '/signin.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    // Check if Cognito configuration is set
    if (!(_config.cognito.userPoolId && _config.cognito.userPoolClientId && _config.cognito.region)) {
        $('#noCognitoMessage').show();
        return;
    }

    // Initialize the Cognito User Pool
    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    // Set AWS Cognito region
    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    // Sign out function
    WildRydes.signOut = function signOut() {
        const currentUser = userPool.getCurrentUser();
        if (currentUser) {
            currentUser.signOut();
        } else {
            console.warn('No user currently signed in.');
        }
    };

    // Fetch current auth token
    WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });

    // Cognito User Pool functions
    function register(email, password, onSuccess, onFailure) {
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'email',
            Value: email
        });

        userPool.signUp(toUsername(email), password, [attributeEmail], null, function signUpCallback(err, result) {
            if (err) {
                onFailure(err);
            } else {
                onSuccess(result);
            }
        });
    }

    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: toUsername(email),
            Password: password
        });

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (err) {
                onFailure(err);
            } else {
                onSuccess(result);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: toUsername(email),
            Pool: userPool
        });
    }

    function toUsername(email) {
        return email.replace('@', '-at-');
    }

    // Event Handlers
    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
    });

    function handleSignin(event) {
        event.preventDefault();
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        
        signin(email, password,
            function signinSuccess() {
                console.log('Successfully Logged In');
                window.location.href = 'ride.html';
            },
            function signinError(err) {
                alert('Sign-in error: ' + err.message || err);
            }
        );
    }

    function handleRegister(event) {
        event.preventDefault();
        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();

        if (password !== password2) {
            return alert('Passwords do not match');
        }

        register(email, password,
            function registerSuccess(result) {
                console.log('User name is ' + result.user.getUsername());
                alert('Registration successful. Please check your email for your verification code.');
                window.location.href = 'verify.html';
            },
            function registerFailure(err) {
                alert('Registration error: ' + err.message || err);
            }
        );
    }

    function handleVerify(event) {
        event.preventDefault();
        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();

        verify(email, code,
            function verifySuccess(result) {
                console.log('Successfully verified: ', result);
                alert('Verification successful. You will now be redirected to the login page.');
                window.location.href = signinUrl;
            },
            function verifyError(err) {
                alert('Verification error: ' + err.message || err);
            }
        );
    }
}(jQuery));
