import $ from 'jquery';
import Overlay from "../components/Overlay.svelte";
import GhButton from "../components/GhButton.svelte";
import { SelectorObserver } from "../lib/SelectorObserver";

import { storage } from "../storage";

// Content scripts
// https://developer.chrome.com/docs/extensions/mv3/content_scripts/

// Some global styles on the page
import "./styles.css";
import { copyPatch, diffClick, downloadPatch, parseDiff, selectFile } from './patch';
import { diffSelector, fileSelector, prUrl } from './constants';

const init = () => {
  // const data = await storage.get();
  // console.log('content', data);
  // new Overlay({ target: document.body });

  fetch(`${prUrl}.diff`).then((res) => res.text()).then(parseDiff);

  const domObserver = new SelectorObserver(document.body);

  domObserver.addListener(diffSelector, {
    listener: (elements) => {
      elements.forEach((element) => {
        const el = $(element);
        if (el.hasClass('alreadyInjected')) return;
        el.addClass('alreadyInjected').on('click', diffClick);
      });
    },
    all: true,
    continuous: true,
    debounce: 100,
  });

  domObserver.addListener(fileSelector, {
    listener: (elements) => {
      elements.forEach((element) => {
        const el = $(element);
        if (el.hasClass('alreadyInjected')) return;
        const selectFileBtn = $('<input type="button" />',).attr({
          value: 'Toggle All',
          class: 'selectFile btn btn-sm ml-2',
        }).on('click', selectFile);
        el.addClass('alreadyInjected').after(selectFileBtn);
      });
    },
    all: true,
    continuous: true,
    debounce: 100,
  });


  const target = $('.pr-review-tools .diffbar-item').parent()[0];
  new GhButton({
    target, props: {
      class: 'ml-2 patch-button hidden',
      actions: [
        ['Patch to clipboard', copyPatch],
        ['Download patch', downloadPatch],
      ]
    }
  });
}

document.readyState !== 'loading' ? init() : document.addEventListener('DOMContentLoaded', init);