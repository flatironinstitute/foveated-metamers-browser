<h1 align="center">
  Foveated Metamers Browser
</h1>

Browse natural and simulated foveated metamer images hosted on the Flatiron Institute compute cluster.

## Quick start

1.  **Start developing.**

    Navigate to the Flatiron cluster, clone this repo in your `mnt/home/<username>`, and start it up. 
    If you are not on the FI network, fire up that VPN.

    ```zsh
    npm install
    npm run dev
    ```

    You may also run the app locally and proxy image requests to the live site:

    ```zsh
    npm run proxy
    npm run dev
    ```

2.  **Open the source code and start editing!**

    Your site is now running at `http://localhost:3000/`

## Deploy

1. **Make the production build**

   ```zsh
   npm run build
   ```

2. Move the contents of `dist` to the ~/USERNAME/public_www/ folder

   Your project is now running at `https://flatironinstitute.org/~<username>