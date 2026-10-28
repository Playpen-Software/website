export async function populateSVGs(rpcFetchSvg?: (path: string) => Promise<string>) {
    // Select both custom element tag forms (<svgPlaceholder> and <svgplaceholder>)
    const placeholders = document.querySelectorAll('svgPlaceholder, svgplaceholder');

    for (const placeholder of Array.from(placeholders)) {
        const path = placeholder.textContent?.trim();
        
        if (!path) {
            console.warn("Found an <svgPlaceholder> without a valid file path inside.");
            placeholder.remove();
            continue;
        }

        try {
            let svgText = "";

            // Use RPC handler if provided, otherwise default to standard fetch()
            if (rpcFetchSvg) {
                svgText = await rpcFetchSvg(path);
            } else {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`HTTP status ${response.status}`);
                }
                svgText = await response.text();
            }

            // Parse SVG string into DOM nodes
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            if (!svgElement || svgDoc.querySelector('parsererror')) {
                throw new Error(`No valid <svg> tag found in file at path: "${path}"`);
            }

            for (const attribute of Array.from(placeholder.attributes)) {
                svgElement.setAttribute(attribute.name, attribute.value);
            }

            placeholder.replaceWith(svgElement);
        } catch (error) {
            console.error(`Failed to load SVG from path "${path}":`, error);
            placeholder.remove();
        }
    }
}