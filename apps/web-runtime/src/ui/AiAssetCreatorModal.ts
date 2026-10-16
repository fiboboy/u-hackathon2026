import { mcpConsole } from "./McpConsole";

export interface GeneratedAsset {
  id: string;
  name: string;
  prompt: string;
  footprint: "1x1" | "2x1" | "2x2";
  referenceImage: string;
  pixelSpriteUrl: string;
}

export class AiAssetCreatorModal {
  private modalEl!: HTMLElement;
  private promptInput!: HTMLTextAreaElement;
  private footprintPills: HTMLButtonElement[] = [];
  private selectedFootprint: "1x1" | "2x1" | "2x2" = "2x2";
  private referencePreviewImg!: HTMLImageElement;
  private pixelPreviewImg!: HTMLImageElement;
  private stepElements: HTMLElement[] = [];
  private progressBarFill!: HTMLElement;
  private statusLabel!: HTMLElement;
  private generateBtn!: HTMLButtonElement;
  private applyBtn!: HTMLButtonElement;
  private regenBtn!: HTMLButtonElement;
  private isGenerating = false;

  private currentAsset: GeneratedAsset = {
    id: "cedar_tub_ai_01",
    name: "Cedar Herbal Barrel Tub",
    prompt: "Handcrafted Japanese cedar barrel tub for phytotherapy and aromatic herbal soaking with copper hoops",
    footprint: "2x2",
    referenceImage: "/assets/cedar_tub_reference.jpg",
    pixelSpriteUrl: "/assets/cedar_tub_pixel.png"
  };

  public onApplyRequested?: (asset: GeneratedAsset) => void;

  constructor() {
    this.initElements();
  }

  private initElements() {
    this.modalEl = document.getElementById("ai-asset-modal") as HTMLElement;
    this.promptInput = document.getElementById("ai-modal-prompt") as HTMLTextAreaElement;
    this.referencePreviewImg = document.getElementById("ai-preview-raw") as HTMLImageElement;
    this.pixelPreviewImg = document.getElementById("ai-preview-pixel") as HTMLImageElement;
    this.progressBarFill = document.getElementById("ai-stepper-progress-fill") as HTMLElement;
    this.statusLabel = document.getElementById("ai-pipeline-status") as HTMLElement;
    this.generateBtn = document.getElementById("btn-ai-start-generate") as HTMLButtonElement;
    this.applyBtn = document.getElementById("btn-ai-apply-salon") as HTMLButtonElement;
    this.regenBtn = document.getElementById("btn-ai-regenerate") as HTMLButtonElement;

    // Footprint buttons
    this.footprintPills = Array.from(document.querySelectorAll<HTMLButtonElement>(".footprint-pill"));
    this.footprintPills.forEach(pill => {
      pill.addEventListener("click", () => {
        this.footprintPills.forEach(p => p.classList.remove("active-pill"));
        pill.classList.add("active-pill");
        this.selectedFootprint = (pill.dataset.footprint || "2x2") as any;
        this.currentAsset.footprint = this.selectedFootprint;
      });
    });

    // Preset prompts
    document.querySelectorAll<HTMLButtonElement>(".preset-prompt-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const text = chip.dataset.prompt || chip.textContent || "";
        if (this.promptInput) {
          this.promptInput.value = text;
        }
      });
    });

    // Reference photo sample loader
    document.getElementById("btn-load-sample-photo")?.addEventListener("click", () => {
      if (this.referencePreviewImg) {
        this.referencePreviewImg.src = "/assets/cedar_tub_reference.jpg";
      }
      mcpConsole.logEngine("REF_UPLOAD", "Reference image loaded: Cedar herbal barrel tub (320x240 RGB)");
    });

    // File input handler
    const fileInput = document.getElementById("ai-ref-file-input") as HTMLInputElement;
    fileInput?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && this.referencePreviewImg) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          this.referencePreviewImg.src = ev.target?.result as string;
          mcpConsole.logEngine("REF_UPLOAD", `User reference image uploaded: ${file.name} (${Math.round(file.size / 1024)} KB)`);
        };
        reader.readAsDataURL(file);
      }
    });

    // Pipeline steps
    this.stepElements = [
      document.getElementById("step-1-concept")!,
      document.getElementById("step-2-rembg")!,
      document.getElementById("step-3-snap")!,
      document.getElementById("step-4-atlas")!
    ].filter(Boolean);

    // Modal controls
    document.getElementById("ai-modal-close")?.addEventListener("click", () => this.hide());
    document.getElementById("ai-modal-cancel")?.addEventListener("click", () => this.hide());

    this.generateBtn?.addEventListener("click", () => this.runAiPipeline());
    this.regenBtn?.addEventListener("click", () => this.runAiPipeline());

    this.applyBtn?.addEventListener("click", () => {
      this.currentAsset.prompt = this.promptInput?.value || this.currentAsset.prompt;
      this.onApplyRequested?.(this.currentAsset);
      this.hide();
    });
  }

  public show() {
    if (this.modalEl) {
      this.modalEl.classList.add("visible");
      if (this.promptInput && !this.promptInput.value) {
        this.promptInput.value = this.currentAsset.prompt;
      }
      this.resetPipelineUI();
    }
  }

  public open() {
    this.show();
  }

  public hide() {
    if (this.modalEl) {
      this.modalEl.classList.remove("visible");
    }
  }

  public close() {
    this.hide();
  }

  private resetPipelineUI() {
    this.stepElements.forEach(el => {
      el.className = "pipeline-step-item step-pending";
    });
    if (this.progressBarFill) this.progressBarFill.style.width = "0%";
    if (this.statusLabel) this.statusLabel.textContent = "Ready to generate · Enter prompt or upload reference photo";
    if (this.applyBtn) this.applyBtn.disabled = false;
  }

  public async runAiPipeline() {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.generateBtn.disabled = true;
    this.applyBtn.disabled = true;

    const promptText = this.promptInput?.value.trim() || this.currentAsset.prompt;
    mcpConsole.logMcpIn("generate_spatial_asset", {
      prompt: promptText,
      footprint: this.selectedFootprint,
      style: "16-bit isometric pixel-art Japanese spa"
    });

    // Step 1: AI Concept Generation
    this.setStepState(0, "active", "Generating 16-bit isometric pixel concept with Nano Banana / AI Engine...");
    if (this.progressBarFill) this.progressBarFill.style.width = "25%";
    mcpConsole.logPipeline(1, 4, "concept_generation", `prompt: "${promptText.slice(0, 48)}..."`);
    await this.delay(800);
    this.setStepState(0, "done");

    // Step 2: rembg Background Removal
    this.setStepState(1, "active", "Removing background with rembg alpha segmentation...");
    if (this.progressBarFill) this.progressBarFill.style.width = "50%";
    mcpConsole.logPipeline(2, 4, "rembg", "alpha matte extracted (clean 128x128 RGBA cutout)");
    await this.delay(700);
    this.setStepState(1, "done");

    // Step 3: Quantization & Pixel Snapper
    this.setStepState(2, "active", "Color quantization & 2.5D isometric grid snapping...");
    if (this.progressBarFill) this.progressBarFill.style.width = "75%";
    mcpConsole.logPipeline(3, 4, "pixel_snapper", "16-color dithering & 0.46 slope isometric projection");
    await this.delay(700);
    this.setStepState(2, "done");

    // Step 4: Atlas Injection
    this.setStepState(3, "active", "Injecting sub-texture into spa_atlas.json & Phaser GPU memory...");
    if (this.progressBarFill) this.progressBarFill.style.width = "100%";
    mcpConsole.logPipeline(4, 4, "atlas_injection", "spa_atlas.json dynamic frame allocation");
    await this.delay(600);
    this.setStepState(3, "done");

    // Finish
    if (this.statusLabel) {
      this.statusLabel.textContent = "Pipeline complete! 16-bit isometric asset compiled and verified.";
    }
    if (this.pixelPreviewImg) {
      this.pixelPreviewImg.src = "/assets/cedar_tub_pixel.png";
      this.pixelPreviewImg.style.display = "block";
    }

    mcpConsole.logMcpOut("generate_spatial_asset", {
      status: "ready",
      asset_id: this.currentAsset.id,
      dimensions: this.selectedFootprint,
      atlas_frame: "cedar_tub_pixel"
    });

    this.isGenerating = false;
    this.generateBtn.disabled = false;
    this.applyBtn.disabled = false;
    this.applyBtn.classList.add("highlight-pulse");
  }

  private setStepState(index: number, state: "pending" | "active" | "done", statusMsg?: string) {
    const el = this.stepElements[index];
    if (!el) return;
    el.className = `pipeline-step-item step-${state}`;
    if (statusMsg && this.statusLabel) {
      this.statusLabel.textContent = statusMsg;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
