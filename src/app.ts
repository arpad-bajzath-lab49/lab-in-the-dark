// @ts-expect-error
import "./index.css"

import ace from "brace"
import "brace/mode/html"
import "brace/theme/tomorrow_night_bright"
import "brace/ext/searchbox"

class Utils {
  static debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: ReturnType<typeof setTimeout>
    return ((...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }) as T
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T, 
    wait: number, 
    options: { trailing?: boolean } = {}
  ): T {
    let timeout: ReturnType<typeof setTimeout> | null = null
    let previous = 0
    
    return ((...args: Parameters<T>) => {
      const now = Date.now()
      if (!previous) previous = now
      const remaining = wait - (now - previous)
      
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout)
          timeout = null
        }
        previous = now
        func(...args)
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(() => {
          previous = 0
          timeout = null
          func(...args)
        }, remaining)
      }
    }) as T
  }

  static defer(func: () => void): void {
    setTimeout(func, 0)
  }

  static sample<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  static random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

class App {
  private readonly STREAK_TIMEOUT = 10 * 1000
  private readonly EXCLAMATION_EVERY = 10
  private readonly EXCLAMATIONS = [
    "<span class='emoji'>🔥</span>",
    "<span class='emoji'>💥</span>",
    "<span class='emoji'>😱</span>",
    "<span class='emoji'>🤯</span>",
    "<span class='emoji'>🚀</span>",
    "<span class='emoji'>✨</span>",
    "<span class='emoji'>😎</span>",
    "<span class='emoji'>👏</span>",
    "<span class='emoji'>🆒</span>",
    "<span class='emoji'>🤘</span>",
    "<span class='emoji'>🙌</span>",
    "<span class='emoji'>💫</span>",
    "<span class='emoji'>🎉</span>",
    "<span class='emoji'>🧨</span>",
    "Wow!",
    "Nice!",
    "Epic!",
    "Cool!"
  ];  

  private currentStreak = 0
  private streakCounter: HTMLElement
  private streakBar: HTMLElement
  private exclamations: HTMLElement
  private reference: HTMLElement
  private nameTag: HTMLElement
  private result: HTMLIFrameElement
  private finishButton: HTMLElement
  private body: HTMLElement
  private editor: ace.Editor
  
  private debouncedSaveContent: () => void
  private debouncedEndStreak: () => void

  constructor() {
    this.streakCounter = document.querySelector(".streak-container .counter")!
    this.streakBar = document.querySelector(".streak-container .bar")!
    this.exclamations = document.querySelector(".streak-container .exclamations")!
    this.reference = document.querySelector(".reference-screenshot-container")!
    this.nameTag = document.querySelector(".name-tag")!
    this.result = document.querySelector(".result")! as HTMLIFrameElement
    this.finishButton = document.querySelector(".finish-button")!

    this.body = document.body

    this.debouncedSaveContent = Utils.debounce(this.saveContent.bind(this), 300)
    this.debouncedEndStreak = Utils.debounce(this.endStreak.bind(this), this.STREAK_TIMEOUT)

    this.editor = this.setupAce()
    this.loadContent()
    this.editor.focus()

    this.editor.getSession().on("change", this.onChange.bind(this))
    process.env.NODE_ENV !== 'development' && window.addEventListener("beforeunload", (e) => {
      e.preventDefault()
      return "Hold your horses!"
    })

    const instructionElements = document.querySelectorAll(".instructions-container, .instructions-button")
    instructionElements.forEach(el => el.addEventListener("click", this.onClickInstructions.bind(this)))

    this.reference.addEventListener("click", this.onClickReference.bind(this))
    this.finishButton.addEventListener("click", this.onClickFinish.bind(this))
    this.nameTag.addEventListener("click", () => this.getName(true))

    this.getName()
  }

  private setupAce(): ace.Editor {
    const editor = ace.edit("editor")

    editor.setShowPrintMargin(false)
    editor.setHighlightActiveLine(false)
    editor.setFontSize('20px')
    editor.setTheme("ace/theme/tomorrow_night_bright")
    editor.getSession().setMode("ace/mode/html")
    editor.getSession().setUseSoftTabs(true)
    editor.getSession().setTabSize(2)
    editor.session.setUseWorker(false)
    editor.setShowFoldWidgets(false);
    editor.$blockScrolling = Infinity

    return editor
  }

  private getName(forceUpdate?: boolean): void {
    const name = (!forceUpdate && localStorage.getItem("name")) || prompt("What's your name?")
    if (name) {
      localStorage.setItem("name", name)
      this.nameTag.textContent = name
    }
  }

  private loadContent(): void {
    const content = localStorage.getItem("content")
    if (!content) return
    this.editor.setValue(content, -1)
  }

  private saveContent(): void {
    localStorage.setItem("content", this.editor.getValue())
  }

  private increaseStreak(): void {
    this.currentStreak++
    
    if (this.currentStreak > 0 && this.currentStreak % this.EXCLAMATION_EVERY === 0) {
      this.showExclamation()
    }

    this.refreshStreakBar()
    this.renderStreak()
  }

  private endStreak(): void {
    this.currentStreak = 0
    this.renderStreak()
  }

  private renderStreak(): void {
    this.streakCounter.textContent = this.currentStreak.toString()
    this.streakCounter.classList.remove("bump")

    Utils.defer(() => {
      this.streakCounter.classList.add("bump")
    })
  }

  private refreshStreakBar(): void {
    const bar = this.streakBar as HTMLElement
    bar.style.transform = "scaleX(1)"
    bar.style.transition = "none"

    Utils.defer(() => {
      bar.style.transform = ""
      bar.style.transition = `all ${this.STREAK_TIMEOUT}ms linear`
    })
  }

  private showExclamation(): void {
    const exclamation = document.createElement("span")
    exclamation.classList.add("exclamation")
    exclamation.innerHTML = Utils.sample(this.EXCLAMATIONS)

    this.exclamations.insertBefore(exclamation, this.exclamations.firstChild)
    setTimeout(() => {
      exclamation.remove()
    }, 3000)
  }

  private onClickInstructions(): void {
    this.body.classList.toggle("show-instructions")
    if (!this.body.classList.contains("show-instructions")) {
      this.editor.focus()
    }
  }

  private onClickReference(): void {
    this.reference.classList.toggle("active")
    if (!this.reference.classList.contains("active")) {
      this.editor.focus()
    }
  }

  private onClickFinish(): void {
    const confirm = prompt(`
      Did you finish? Type "yes" to confirm.
    `)

    if (confirm?.toLowerCase() === "yes") {
      this.result.contentWindow?.postMessage(this.editor.getValue(), "*")
      this.result.style.display = "block"
    }
  }

  private onChange(e: any): void {
    this.debouncedSaveContent()
    const insertTextAction = e.action === "insert"
    if (insertTextAction) {
      this.increaseStreak()
      this.debouncedEndStreak()
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App())
} else {
  new App()
}