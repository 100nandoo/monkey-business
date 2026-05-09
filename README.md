# Monkey Business

![Monkey Business](assets/monkey_business.png)

Small userscripts for smoothing out a few YouTube UX issues.

## Scripts

- `yt-sort-by-views.user.js`: adds a `Most Viewed` button on YouTube channel `/videos` pages and reorders loaded videos by parsed view count.
- `yt-stop-pagination.user.js`: stops YouTube from loading more channel videos through the continuation spinner / infinite scroll on `/videos` pages.
- `yt-watch.user.js`: restores hidden fullscreen quick actions on YouTube watch pages.

## Install

1. Install a userscript manager such as [Violentmonkey](https://violentmonkey.github.io/).
2. Open the raw contents of any `*.user.js` file in this repository.
3. Let the userscript manager install it.
4. Refresh the matching YouTube page.

If you want the `Most Viewed` script to work against only the currently loaded set of channel videos, install just `yt-sort-by-views.user.js`.

If you also want YouTube to stop fetching more items before sorting, install `yt-stop-pagination.user.js` or use the built-in pagination stop bundled into `yt-sort-by-views.user.js` when the button is pressed.

## Behavior Notes

- These scripts target the current YouTube DOM and may need updates if YouTube changes its markup or navigation events.
- View sorting only applies to videos already present in the DOM.
- The sort script supports abbreviated counts like `K`, `M`, and `B`.
- All scripts are plain browser userscripts with `@grant none`.

## Repo Layout

- `assets/`: screenshots or supporting images.

## Development

There is no build step. Edit the userscripts directly and reload them in your userscript manager while testing on YouTube.
