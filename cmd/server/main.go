package main

import (
    "encoding/json"
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "sync"

    "github.com/gin-gonic/gin"
)

const notesFile = "notes.json"

var (
    notesMutex sync.Mutex
    notesData  []Note
)

type Note struct {
    ID        string `json:"id"`
    Content   string `json:"content"`
    X         float64 `json:"x"`
    Y         float64 `json:"y"`
    Quadrant  string `json:"quadrant"`
}

func main() {
    loadNotes()

    r := gin.Default()
    r.Static("/static", "./static")
    r.GET("/", func(c *gin.Context) {
        c.File("./templates/page.html")
    })
    r.GET("/api/notes", getNotes)
    r.POST("/api/notes/add", addNote)
    r.POST("/api/notes/update", updateNote)

    r.Run(":8081")
}

func loadNotes() {
    notesMutex.Lock()
    defer notesMutex.Unlock()

    if _, err := os.Stat(notesFile); os.IsNotExist(err) {
        log.Println("Notes file does not exist. Creating a new one.")
        notesData = []Note{}
        err := saveNotes()
        if err != nil {
            log.Fatalf("Failed to save initial notes file: %v", err)
        }
        return
    }

    file, err := ioutil.ReadFile(notesFile)
    if err != nil {
        log.Fatalf("Failed to read notes file: %v", err)
    }

    log.Println("Read notes file successfully.")

    err = json.Unmarshal(file, &notesData)
    if err != nil {
        log.Fatalf("Failed to unmarshal notes data: %v", err)
    }

    log.Println("Unmarshalled notes data successfully.")
}

func saveNotes() error {
    notesMutex.Lock()
    defer notesMutex.Unlock()

    file, err := json.MarshalIndent(notesData, "", "  ")
    if err != nil {
        return err
    }

    err = ioutil.WriteFile(notesFile, file, 0644)
    if err != nil {
        return err
    }

    log.Println("Saved notes data successfully.")
    return nil
}



func getNotes(c *gin.Context) {
    notesMutex.Lock()
    defer notesMutex.Unlock()
    c.JSON(http.StatusOK, notesData)
}

func addNote(c *gin.Context) {
    var newNote Note
    if err := c.BindJSON(&newNote); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    notesMutex.Lock()
    notesData = append(notesData, newNote)
    notesMutex.Unlock()

    saveNotes()
    c.Status(http.StatusOK)
}

func updateNote(c *gin.Context) {
    var updatedNote Note
    if err := c.BindJSON(&updatedNote); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    notesMutex.Lock()
    defer notesMutex.Unlock()

    for i, note := range notesData {
        if note.ID == updatedNote.ID {
            notesData[i] = updatedNote
            saveNotes()
            c.Status(http.StatusOK)
            return
        }
    }

    c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
}
