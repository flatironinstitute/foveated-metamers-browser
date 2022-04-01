<h1 align="center">
  Foveated Metamers Browser
</h1>

Browse natural and simulated foveated metamer images hosted on the Flatiron Institute compute cluster.

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
put site at /~wbroderick/metamers and a simple index.html with link to personal page and link to /metamers
- Move slider and zoom to the top left
- Images only in full / half / quarter / eigth of full size.
- Add lorem ipsum for where pleasse do not zoom dude. will go.
- Scaling to a dropdown - choices will update based on model.
- Initialization type: make white into "white noise", move that to top of list.
- Remove all Gamma Corrected Column and remove all values where Gamma Corrected = true;
- Tie the 50% gray to the gamma
- Move the about to the top then image then table.
- Model: "" Target Image: "" Scaling Value: ""
- Image hover and zoom in webpack bug
- Paginate https://stackoverflow.com/questions/42761068/paginate-javascript-array
- Add sortby on table column heads
- Table: metadata definiation on hover or in filter area?
- Fix slate to gray?
- Top right button update link
- Favicon
- Create test url

Punt
- Select all / deselect all
