<h1 align="center">
  Foveated Metamers Browser
</h1>

Browse natural and simulated foveated metamer images hosted on the Flatiron Institute compute cluster.

## Quick start

1.  **Start developing.**

    Navigate to the Flatiron cluster, clone this repo in your `mnt/home/<username>`, and start it up. If you are not on the FI network, fire up that VPN.

    ```zsh
    npm install
    npm run dev
    ```

2.  **Open the source code and start editing!**

    Your site is now running at `http://localhost:3000/`

## Deploy

1. **Run the linters and prettifier**

   ```zsh
   npm run lint && npm run pretty
   ```

2. **Make the production build**

   ```zsh
   npm run build
   ```

3. Move the contents of `dist` to the ~/USERNAME/public_www/ folder

   Your project is now running at `https://flatironinstitute.org/~<username>

### Liz

- [ ] Remove all Gamma Corrected Column and remove all values where Gamma Corrected = true; - Liz
- [ ] Gamma Slider: Liz to make the slider and give a stub function that WB can update.
- [ ] Tie the 50% gray to the gamma - Liz

### Billy

- Gamma Slider: Liz to make the slider and give a stub function that WB can update.
- Select all / deselect all
- pagination
- Add sortby on table column heads
- Table: metadata def on hover or in filter area?
- Check pagination
- Check highlight

### Done:

- [x] Image zoom
- [x] Filter selection bug - Liz
- [x] Put site at /~wbroderick/metamers and a simple index.html with link to personal page and link to /metamers
- [x] Move slider and zoom to the top left
- [x] Top right button update link
- [x] Favicon
- [x] Fix slate to gray?
- [x] Move the about to the top then image then table.
- [x] Model: "" Target Image: "" Scaling Value: ""
- [x] Button
