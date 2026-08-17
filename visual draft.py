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

        #Create a scroll area for, well scrolling
        self.scrollArea1 = QScrollArea()

        #Scroll Area Properties
        self.scrollArea1.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOn)
        self.scrollArea1.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOn)
        self.scrollArea1.setWidgetResizable(True)
        self.scrollArea1.verticalScrollBar().value()

        #Initialize windows
        self.createLoginWindow()

        #Create layouts needed to add items to
        self.loginWindowLayout = QVBoxLayout()

        #Add groupboxes to layouts
        self.loginWindowLayout.addWidget(self.loginWindowGroupBox)

        #make widgets and set layouts
        widgetLogin = QWidget()
        widgetLogin.setLayout(self.loginWindowLayout)

        #Set scroll areas
        self.scrollArea1.setWidget(widgetLogin)

        #Add scroll areas to main stacked layout
        self.mainStackedLayout.addWidget(self.scrollArea1)
        self.mainStackedLayoutWidget.setLayout(self.mainStackedLayout)

        #Finally, add to over everything layout
        self.overEverythingLayout.addWidget(self.mainStackedLayoutWidget)
        self.overEverythingWidget.setLayout(self.overEverythingLayout)

        self.setCentralWidget(self.overEverythingWidget)
        # self.showMaximized()

    def createLoginWindow(self):

        self.loginWindowGroupBox = QGroupBox("Main stacked window")
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

        self.button = QPushButton('Done. Show text', self)
        self.button.clicked.connect(self.loginDoneClicked)
        self.loginWindowGroupBoxLayout.addWidget(self.button, 3,0)

        self.loginWindowGroupBox.setLayout(self.loginWindowGroupBoxLayout)


    def loginDoneClicked(self):

        userName = self.userNameTextBox.text().strip()
        passWord = self.passwordTextBox.text().strip()
        QMessageBox.question(self, "Alert title", 
                            "You typed: username = "+userName+ " | password = "+passWord,
                            QMessageBox.Ok, QMessageBox.Ok)
        self.userNameTextBox.setText("")
        self.passwordTextBox.setText("")







if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    app.exec()

