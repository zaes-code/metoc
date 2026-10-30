/**
 * The sample page's icons: 24-unit stroke glyphs drawn for this page, inlined so the page needs no
 * icon font or package. A button opts in with `data-icon="name"`; {@link decorateIcons} prepends
 * the glyph and keeps the button's text as its accessible name. Not published.
 */

const PATHS: Record<string, string> = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    gallery: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    export: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    import: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
    clear: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    settings:
        '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    'tilt-up': '<path d="m6 15 6-6 6 6"/>',
    'tilt-down': '<path d="m6 9 6 6 6-6"/>',
    north: '<path d="m12 3 5 16-5-4-5 4 5-16Z"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
    send: '<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4 18-7Z"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    backspace: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="m12 9 6 6M18 9l-6 6"/>',
    flip: '<path d="M12 3v18"/><path d="M8 7 3 12l5 5"/><path d="m16 7 5 5-5 5"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
};

/** The SVG markup for an icon. */
export function iconSvg(name: string, size = 16): string {
    const body = PATHS[name] ?? '';
    return `<svg class="icon" aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/**
 * Prepend its icon to every element under `root` that names one with `data-icon`, once, and wrap
 * its text in `.label-text` so a narrow layout can show the icon alone. The text then moves to
 * the title and aria-label, so the button keeps its name when only the icon shows.
 */
export function decorateIcons(root: ParentNode = document): void {
    for (const el of root.querySelectorAll<HTMLElement>('[data-icon]')) {
        if (el.querySelector(':scope > svg.icon')) continue;
        const text = el.textContent?.trim() ?? '';
        if (text) {
            el.textContent = '';
            const span = document.createElement('span');
            span.className = 'label-text';
            span.textContent = text;
            el.append(span);
            if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', text);
            if (!el.title) el.title = text;
        }
        el.insertAdjacentHTML('afterbegin', iconSvg(el.dataset.icon as string));
    }
}
