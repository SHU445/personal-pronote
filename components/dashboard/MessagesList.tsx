"use client"

import { MessageSquare, User, Calendar, Mail, MailOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Discussion } from "@/types/pronote"
import { formatDate } from "@/lib/utils"

interface MessagesListProps {
  discussions: Discussion[]
}

export function MessagesList({ discussions }: MessagesListProps) {
  // Trier par date (plus recentes d'abord)
  const sortedDiscussions = [...discussions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const unreadCount = discussions.filter((d) => !d.lu).length

  if (sortedDiscussions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Aucun message</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mr-2" />
            <span>Aucun message dans votre boite</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>
          {discussions.length} discussion(s)
          {unreadCount > 0 && ` dont ${unreadCount} non lu(s)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedDiscussions.map((discussion, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                !discussion.lu ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="shrink-0 mt-1">
                {discussion.lu ? (
                  <MailOpen className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Mail className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`font-medium ${!discussion.lu ? "text-primary" : ""}`}>
                    {discussion.sujet || "(Sans sujet)"}
                  </span>
                  {!discussion.lu && (
                    <Badge variant="default" className="text-xs">
                      Non lu
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {discussion.auteur && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {discussion.auteur}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(discussion.date)}
                  </span>
                  {discussion.messages_count > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {discussion.messages_count} message(s)
                    </span>
                  )}
                </div>
                {discussion.dernier_message && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {discussion.dernier_message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
