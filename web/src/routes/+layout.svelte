<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Resume Smith | Forge a job-ready resume</title>
	<meta name="application-name" content="Resume Smith" />
	<meta
		name="description"
		content="Build, tailor, and export a polished resume with privacy-conscious AI assistance and customizable Typst templates."
	/>
	<meta property="og:title" content="Resume Smith" />
	<meta
		property="og:description"
		content="Forge a polished, job-ready resume with live previews, AI-assisted tailoring, and Typst PDF export."
	/>
</svelte:head>

{@render children()}
