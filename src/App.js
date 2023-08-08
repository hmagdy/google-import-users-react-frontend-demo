import React, { useEffect, useState } from 'react';


// TD2-Auth-By-Google-Staging --> https://console.cloud.google.com/apis/credentials/oauthclient/232365258888-a37s62floflmfjlmq2npbf1qqnp7eu68.apps.googleusercontent.com?project=td2-backend-staging
const CLIENT_ID = '87105781147-q4e3ukdq2v2vei5891rmo717cob6mtvo.apps.googleusercontent.com';

// TD Google Import Users Demo --> https://console.cloud.google.com/apis/credentials/key/9c8dd43e-8e35-4dd5-81f0-f732014966ee?project=td2-backend-staging
const API_KEY = 'AIzaSyC5cIV31ephb0tlWdkABTvKE7DS3mNr7mc';


const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/people/v1/rest';
const SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/directory.readonly',
];

const buttonStyle = {
  backgroundColor: '#4caf50',
  border: 'none',
  color: 'white',
  padding: '10px 20px',
  textAlign: 'center',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '16px',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

const App = () => {
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [importMode, setImportMode] = useState('');
  const [importedUsers, setImportedUsers] = useState([]);


  useEffect(() => {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.async = true;
    script1.defer = true;
    script1.onload = () => setIsGapiLoaded(true);
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => setIsGisLoaded(true);
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, []);

  useEffect(() => {
    if (isGapiLoaded && isGisLoaded) {
      window.gapi.load('client', initializeGapiClient);
    }
  }, [isGapiLoaded, isGisLoaded]);

  const initializeGapiClient = async () => {
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
  };

  const handleAuthClick = async () => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      callback: '', // defined later
    });

    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        throw resp;
      }

      await listConnectionNames();
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  };

  const handleSignoutClick = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
    }
  };

  const getUserEmailType = async () => {
    try {
      const { result: person } = await window.gapi.client.people.people.get({
        resourceName: 'people/me',
        personFields: 'emailAddresses',
      });

      const email = person.emailAddresses[0].value;
      return email.endsWith('gmail.com') ? 'Gmail' : 'Google-Workspace';
    } catch (error) {
      console.error('Error getting user profile:', error.message);
      throw error;
    }
  };

  const listConnectionNames = async () => {
    let response;
    let users;
    try {
      const emailType = await getUserEmailType();
      if (emailType === 'Gmail') {
        response = await window.gapi.client.people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 100,
          personFields: 'names,emailAddresses',
        });
        users = response.result.connections.map(person => ({ email: person.emailAddresses[0].value, name: person.names[0].displayName }));
        setImportMode('Fetch from Google Contacts')
      } else if (emailType === 'Google-Workspace') {
        response = await window.gapi.client.people.people.listDirectoryPeople({
          pageSize: 100,
          readMask: 'names,emailAddresses',
          sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
        });
        users = response.result.people.map(person => ({ email: person.emailAddresses[0].value, name: person.names[0].displayName }));
        setImportMode('Fetch from Google Directory')
      }
    } catch (err) {
      console.error('Error:', err.message);
      return;
    }
    setImportedUsers(users)
  };

  return (
    <div>
      <p>Google Import Users Demo</p>

      <button id="authorize_button" onClick={handleAuthClick} style={buttonStyle}>Authorize</button>
      <h1>{importMode}</h1>
      <ul>
        {importedUsers.length > 0 && importedUsers.map(user => (
          (<li key={user.email}>
            {user.name}: {user.email}
          </li>)
        ))
        }
      </ul>
    </div>
  );
};

export default App;