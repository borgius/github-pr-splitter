import $ from 'jquery';
import { diffSelector, files } from "./constants";
import { copyToClipboard, downloadFile } from "../lib/utils";

export const parseDiff = (diffText: string) => {
  diffText.match(/diff --git a\/(.*?) b\/(.*?)\n([\s\S]*?)(?=diff --git|$)/g)?.forEach((file) => {
    const fname = file.match(/diff --git a\/(.*?) b\/(.*?)\n/)?.[2];
    const diff = file.match(/diff --git[\s\S]+?(?=@@)/m)?.[0]?.trim();
    if (fname && diff) {
      files[fname] = diff;
    }
  });
}

export const diffClick = (e: JQuery.TriggeredEvent) => {
  $(e?.target)?.toggleClass('diff-selected');
  togglePatchButton();
}

export const selectFile = (e: JQuery.TriggeredEvent) => {
  const file = $(e.target).parents('div.file').first();
  file.find(diffSelector).toggleClass('diff-selected');
  togglePatchButton();
}

export const togglePatchButton = () => {
  $('.diff-selected').length
    ? $('.patch-button').removeClass('hidden')
    : $('.patch-button').addClass('hidden');
}

export const generatePatch = () => {
  const added: string[] = [];
  const patch: string[] = []
  $('.diff-selected').each((i, element) => {
    const el = $(element);
    const file = el.parents('div.file').first().attr('data-tagsearch-path');
    if (file) {
      if (!added.includes(file)) {
        added.push(file);
        patch.push(files[file]);
      }
      patch.push(getDiff(el));
    }
  })
  patch.push('');
  return patch.join('\n');
}

export const downloadPatch = () => {
  const patch = generatePatch();
  downloadFile(patch, 'patch.diff', 'text/plain');
}

export const copyPatch = () => {
  const patch = generatePatch();
  copyToClipboard(patch);
}

const getDiff = (el: JQuery<HTMLElement>) => {
  return $('.file-diff-split').length ? getDiffSplit(el) : getDiffInline(el);
}

const getDiffInline = (el: JQuery<HTMLElement>) => {
  const diff = [];
  diff.push(el.text().trim());
  let line = el.parent('tr').next();
  while (line.attr('data-hunk') || line.hasClass('blob-expanded')) {
    if (!line.hasClass('blob-expanded')) {
      const code = line.find('.blob-code-inner');
      const text = code.attr('data-code-marker') + code.text();
      diff.push(text);
    }
    line = line.next();
  }
  return diff.join('\n');
}

const getDiffSplit = (el: JQuery<HTMLElement>) => {
  const diff = [];
  diff.push(el.text().trim());
  let line = el.parent('tr').next();
  while (line.attr('data-hunk') || line.hasClass('blob-expanded')) {
    if (!line.hasClass('blob-expanded')) {
      const leftCode = line.find('td[data-split-side="left"] .blob-code-inner');
      const left = (leftCode?.attr('data-code-marker') || '') + leftCode?.text()
      const rightCode = line.find('td[data-split-side="right"] .blob-code-inner');
      const rigth = (rightCode?.attr('data-code-marker') || '') + rightCode?.text()
      if (left === rigth) {
        diff.push(left);
      } else {
        if (left) diff.push(left);
        if (rigth) diff.push(rigth);
      }
    }
    line = line.next();
  }
  let i = 0;
  while (i < diff.length) {
    let j = 0;
    while (diff[i + j]?.[0] === '-' && diff[i + j + 1]?.[0] === '+' && diff[i + j * 2 + 2]?.[0] === '-') {
      const minus = diff.splice(i + j * 2 + 2, 1)
      diff.splice(i + j + 1, 0, ...minus)
      j++
    }
    i += j * 2 + 1;
  }

  return diff.join('\n');
}

