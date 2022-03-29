<h1 align="center">
  Foveated Metamers Browser 
</h1>

Browse foveated metamers hosted on the Flatiron Institute compute cluster.

## Quick start

1.  **Start developing.**

    Navigate to the Flatiron cluster, clone this repo in your `mnt/home/<username>`, and start it up. If you are not on the FI network, fire up that VPN.

    ```zsh
    npm run serve
    ```

2.  **Open the source code and start editing!**

    Your site is now running at `http://localhost:8082/` or `http://10.250.144.2:8082/`!

## Deploy

1. **Run the linters and prettifier**

   ```zsh
   npm run lint && npm run pretty 
   ```

2. **Make the production build**

   ```zsh
   npm run lint && npm run pretty 
   ```

3. Move this to the ~/<username>/public_www/ folder

    Your project is now running at `https://flatironinstitute.org/~<username>


## Notes

- Table: work with side selection, metadata hovers or in side bit?
- Change selection on click.
- Add sortby on table column heads
- Change to slider with catagorical variables
- Display 24 per page 
- Display filters on top row
- Top Row display name of the image selected
- Image hover and zoom in
- Fix slate to gray? 
- Top right button
- Favicon
- Create test url