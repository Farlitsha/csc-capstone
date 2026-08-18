##Import fields

#imports for downloading and processing confirmation emails
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, date, time
import imaplib, email
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import COMMASPACE, formatdate
import yaml
import logging
from icalendar import Calendar, Event, vCalAddress, vText
import calendar

#imports for creating the PyQt5 gui
import sys
import os
from PyQt5.QtCore import Qt, QTimer, QObjectCleanupHandler
from PyQt5.QtGui import QKeySequence, QPixmap, QTransform
from PyQt5.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QStackedLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QStackedLayout,
    QVBoxLayout,
    QGridLayout,
    QWidget,
    QGroupBox,
    QScrollArea,
    QSizePolicy,
    QShortcut,
    QLineEdit,
    QMessageBox
)

#Gloabl variables for each instance of the program running
Username = ""
User = 0

class MainWindow(QMainWindow):
    """
    Uses QMainWindow to allow for better support for menu and status bars, as opposed to QDialog
    """
    def __init__(self):
        """
        Sets basic parameters such as dimensions, title, timers
          
        :param self: self
        """
        super().__init__()
        self.title = "Main window/week view"
        self.left = 10 #horizontal offset from the screen’s left edge
        self.top = 10 #vertical offset from the screen’s top edge
        self.height = 900
        self.width = int(self.height*9/16)
        self.initUI()

        #Create timer objects

        #Connect timeout to the update action

        #Start the timers
        print("TRACE")
        self.show()

    def initUI(self):
        """
        Initialize the main UI elements, such as the layouts
            
        :param self: self
        """
        self.setWindowTitle(self.title)
        self.setGeometry(self.left, self.top, self.width, self.height)

        #Create an overlay window to go above all other windows for anything that needs to cover everything else
        self.overEverythingLayout = QStackedLayout()
        self.overEverythingLayout.setStackingMode(QStackedLayout.StackingMode.StackAll) #StackAll = overlap
        self.overEverythingWidget = QWidget()

        #Create stacked layout for switching between windows
        self.mainStackedLayout = QStackedLayout()
        self.mainStackedLayoutWidget = QWidget()

        

        #Initialize windows
        self.createLoginWindow()

        #Create layouts needed to add items to
        self.loginWindowLayout = QVBoxLayout()

        #Add groupboxes to layouts
        self.loginWindowLayout.addWidget(self.loginWindowGroupBox)

        #make widgets and set layouts
        self.widgetLogin = QWidget()
        self.widgetLogin.setLayout(self.loginWindowLayout)

        #Add scroll areas to main stacked layout
        self.mainStackedLayout.addWidget(self.widgetLogin)
        self.mainStackedLayoutWidget.setLayout(self.mainStackedLayout)

        #Finally, add to over everything layout
        self.overEverythingLayout.addWidget(self.mainStackedLayoutWidget)
        self.overEverythingWidget.setLayout(self.overEverythingLayout)

        self.setCentralWidget(self.overEverythingWidget)
        # self.showMaximized()

    def createLoginWindow(self):

        self.loginWindowGroupBox = QGroupBox("Main stacked window")
        # self.loginWindowGroupBox.setStyleSheet("background-color: gray")
        self.loginWindowGroupBoxLayout = QGridLayout()

        login = QLabel("Login username:")
        # login.setStyleSheet("border: 1px solid; border-color: gray")
        self.loginWindowGroupBoxLayout.addWidget(login,0,0)
        self.loginWindowGroupBoxLayout.addWidget(QLabel("Password:"),1,0)

        #Input text fields
        self.userNameTextBox = QLineEdit(self)
        self.userNameTextBox.setStyleSheet("border-color: black; border-radius: 10px; padding 10px")
        self.userNameTextBox.resize(200,40)
        self.passwordTextBox = QLineEdit(self)
        self.passwordTextBox.setStyleSheet("border-color: black; border-radius: 10px; padding 10px")
        self.passwordTextBox.resize(200,40)

        #Adding text fields to layout
        self.loginWindowGroupBoxLayout.addWidget(self.userNameTextBox,0,1)
        self.loginWindowGroupBoxLayout.addWidget(self.passwordTextBox,1,1)

        button = QPushButton('Done. Show text')
        button.resize(300,100)
        button.clicked.connect(self.loginDoneClicked)
        self.loginWindowGroupBoxLayout.addWidget(button, 3,0)

        self.loginWindowGroupBox.setLayout(self.loginWindowGroupBoxLayout)

    def createUserProfileWindow(self):
        return 0

    def createUserHomePageWindow(self):
        """Creates the home page for the user showing name, unread messages, services near you, etc...
        """

        #Main boxes
        self.userHomeScrollArea = QScrollArea()
        self.userHomeScrollArea.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOn)
        self.userHomeScrollArea.setWidgetResizable(True)
        self.userHomeWidget = QWidget()
        self.userHomeWidgetLayout = QVBoxLayout()

        #TRACE FOR TESTING
        # self.userHomeWidget.setStyleSheet("border: 1px; border-color: black")

        ##Sub boxes/widgets, organized per vertical level
        #Top box containing qlabel and serach button
        topWidget = QWidget()
        topWidgetLayout = QGridLayout()

        OrgLogo = QLabel("CommHub")
        usernameLogo = QLabel("Welcome "+Username)
        searchButton = QPushButton("Search")
        searchButton.setStyleSheet("border-radius: 10px; border-color: black")
        searchButton.clicked.connect(self.searchButtonClicked)
        topWidgetLayout.addWidget(OrgLogo,0,0)
        topWidgetLayout.addWidget(usernameLogo,0,2)
        topWidgetLayout.addWidget(QLabel("       "),0,1) #Padding
        topWidgetLayout.addWidget(QLabel("                       "),0,3) #Padding
        topWidgetLayout.addWidget(QLabel("                       "),0,4) #Padding

        topWidgetLayout.addWidget(searchButton,0,5)

        #SetLayouts to widgets
        topWidget.setLayout(topWidgetLayout)


        #Finally, adding everything to the main boxes
        self.userHomeWidgetLayout.addWidget(topWidget)



        #Set the layout and Main widget
        self.userHomeWidget.setLayout(self.userHomeWidgetLayout)
        self.userHomeScrollArea.setWidget(self.userHomeWidget)

        #Check if there's already someone logged in. If so, remove them
        number_of_widgets = self.mainStackedLayout.count()
        print("Currently, ",number_of_widgets, "widgets")

        # if number_of_widgets >1:
        #     widget = self.mainStackedLayout.itemAt(1)
        #     self.mainStackedLayout.replaceWidget(widget, self.userHomeScrollArea)
        # else:
        #     self.mainStackedLayout.insertWidget(1, self.userHomeScrollArea)

        self.mainStackedLayout.insertWidget(1, self.userHomeScrollArea)



    def createAdvertsWindow(self):
        return 0

    def loginDoneClicked(self):

        userName = self.userNameTextBox.text().strip()
        passWord = self.passwordTextBox.text().strip()

        global Username
        Username = userName
        QMessageBox.question(self, "Alert title", 
                            "You typed: username = "+userName+ " | password = "+passWord,
                            QMessageBox.Ok, QMessageBox.Ok)
        self.userNameTextBox.setText("")
        self.passwordTextBox.setText("")
        self.createUserHomePageWindow()

    def searchButtonClicked(self):
        return 0


    def keyPressEvent(self, event):
        """Always running, traks all keyboard events, loop executed by QApplication.exec()

        Args:
            event (_type = i dunno_): the unix code of the keyboard key pressed
        """
        if event.key() == Qt.Key_D: #D is used to represent the roght arow, or scroll right. arrow keys have different unix values on windows and linux so can't use those
            if self.mainStackedLayout.currentIndex() == 0:
                self.mainStackedLayout.setCurrentIndex(1)
            elif self.mainStackedLayout.currentIndex() == 1:
                self.mainStackedLayout.setCurrentIndex(0)

        elif event.key() == Qt.Key_K:
            self.mainStackedLayout.setCurrentIndex(2)




if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    app.exec()

